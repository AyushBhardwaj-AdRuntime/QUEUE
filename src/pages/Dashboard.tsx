import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { LogOut, Hospital, MapPin, Phone, Mail, Users, Plus, Minus, QrCode, Home } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import QRCode from "react-qr-code";

interface Hospital {
  id: string;
  name: string;
  address: string;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_phone: string | null;
  contact_email: string | null;
}

interface WaitingList {
  id: string;
  waiting_count: number;
  last_updated: string;
}

const Dashboard = () => {
  const [user, setUser] = useState<User | null>(null);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [waitingList, setWaitingList] = useState<WaitingList | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [hospitalForm, setHospitalForm] = useState({
    name: "",
    address: "",
    pincode: "",
    contact_phone: "",
    contact_email: "",
  });
  const [locationMode, setLocationMode] = useState<"auto" | "pincode">("auto");
  const [locationStatus, setLocationStatus] = useState<string>("");
  const [autoLocation, setAutoLocation] = useState<{latitude: number, longitude: number} | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      setUser(session.user);
      await fetchHospitalData(session.user.id);
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchHospitalData = async (userId: string) => {
    const { data: hospitalData, error: hospitalError } = await supabase
      .from("hospitals")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (hospitalError) {
      console.error("Error fetching hospital:", hospitalError);
      return;
    }

    if (hospitalData) {
      setHospital(hospitalData);
      
      const { data: waitingData, error: waitingError } = await supabase
        .from("waiting_lists")
        .select("*")
        .eq("hospital_id", hospitalData.id)
        .maybeSingle();

      if (waitingError) {
        console.error("Error fetching waiting list:", waitingError);
      } else {
        setWaitingList(waitingData);
      }
    } else {
      setIsCreating(true);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const getAutomaticLocation = () => {
    setLocationStatus("Getting your location...");
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setAutoLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setLocationStatus("Location detected successfully!");
          toast({
            title: "Location Detected",
            description: "Your hospital location has been automatically detected",
          });
        },
        (error) => {
          setLocationStatus("Unable to get location. Please use pincode instead.");
          setLocationMode("pincode");
          toast({
            title: "Location Error",
            description: "Please enable location access or use pincode",
            variant: "destructive",
          });
        }
      );
    } else {
      setLocationStatus("Location not supported. Please use pincode.");
      setLocationMode("pincode");
    }
  };

  const createHospital = async () => {
    if (!user || !hospitalForm.name || !hospitalForm.address) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (locationMode === "auto" && !autoLocation) {
      toast({
        title: "Error",
        description: "Please allow location access or switch to pincode mode",
        variant: "destructive",
      });
      return;
    }

    if (locationMode === "pincode" && !hospitalForm.pincode) {
      toast({
        title: "Error",
        description: "Please enter your pincode",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from("hospitals")
      .insert([{
        name: hospitalForm.name,
        address: hospitalForm.address,
        pincode: hospitalForm.pincode || null,
        latitude: locationMode === "auto" && autoLocation ? autoLocation.latitude : null,
        longitude: locationMode === "auto" && autoLocation ? autoLocation.longitude : null,
        contact_phone: hospitalForm.contact_phone || null,
        contact_email: hospitalForm.contact_email || null,
        user_id: user.id,
      }])
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create hospital profile",
        variant: "destructive",
      });
      console.error("Error creating hospital:", error);
    } else {
      setHospital(data);
      setIsCreating(false);
      toast({
        title: "Success",
        description: "Hospital profile created successfully",
      });
      await fetchHospitalData(user.id);
    }
  };

  const updateWaitingCount = async (change: number) => {
    if (!waitingList || !hospital) return;

    const newCount = Math.max(0, waitingList.waiting_count + change);
    
    const { error } = await supabase
      .from("waiting_lists")
      .update({ 
        waiting_count: newCount,
        last_updated: new Date().toISOString()
      })
      .eq("hospital_id", hospital.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update waiting count",
        variant: "destructive",
      });
      console.error("Error updating waiting count:", error);
    } else {
      setWaitingList({
        ...waitingList,
        waiting_count: newCount,
        last_updated: new Date().toISOString()
      });
      toast({
        title: "Updated",
        description: `Waiting count updated to ${newCount}`,
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="text-center">
          <Hospital className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (isCreating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <div className="max-w-2xl mx-auto py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-4xl font-bold mb-2">Create Hospital Profile</h1>
              <p className="text-muted-foreground text-lg">Set up your hospital information to get started</p>
            </div>
            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>

          <Card className="shadow-soft-lg border-primary/10">
            <CardHeader>
              <CardTitle className="text-2xl">Hospital Information</CardTitle>
              <CardDescription className="text-base">
                Enter your hospital details to begin managing your waiting list
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Input
                  placeholder="Hospital Name *"
                  value={hospitalForm.name}
                  onChange={(e) => setHospitalForm({...hospitalForm, name: e.target.value})}
                  className="h-12"
                />
              </div>
              <div>
                <Input
                  placeholder="Full Address *"
                  value={hospitalForm.address}
                  onChange={(e) => setHospitalForm({...hospitalForm, address: e.target.value})}
                  className="h-12"
                />
              </div>
              
              {/* Location Method Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Location Method</label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={locationMode === "auto" ? "default" : "outline"}
                    onClick={() => {
                      setLocationMode("auto");
                      getAutomaticLocation();
                    }}
                    className="flex-1"
                  >
                    <MapPin className="h-4 w-4 mr-2" />
                    Auto-detect Location
                  </Button>
                  <Button
                    type="button"
                    variant={locationMode === "pincode" ? "default" : "outline"}
                    onClick={() => setLocationMode("pincode")}
                    className="flex-1"
                  >
                    Pincode
                  </Button>
                </div>
                {locationStatus && (
                  <p className="text-sm text-muted-foreground">{locationStatus}</p>
                )}
              </div>

              {locationMode === "pincode" && (
                <div>
                  <Input
                    placeholder="Pincode *"
                    value={hospitalForm.pincode}
                    onChange={(e) => setHospitalForm({...hospitalForm, pincode: e.target.value})}
                    className="h-12"
                  />
                </div>
              )}

              <div>
                <Input
                  placeholder="Contact Phone"
                  value={hospitalForm.contact_phone}
                  onChange={(e) => setHospitalForm({...hospitalForm, contact_phone: e.target.value})}
                  className="h-12"
                />
              </div>
              <div>
                <Input
                  placeholder="Contact Email"
                  type="email"
                  value={hospitalForm.contact_email}
                  onChange={(e) => setHospitalForm({...hospitalForm, contact_email: e.target.value})}
                  className="h-12"
                />
              </div>
              <Button onClick={createHospital} className="w-full h-12 text-base">
                Create Hospital Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <Hospital className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Hospital Dashboard</h1>
              <p className="text-sm text-muted-foreground">Manage your waiting list</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
              <Home className="h-4 w-4" />
              Public View
            </Button>
            <Button variant="outline" onClick={handleSignOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="grid gap-6 lg:grid-cols-2 max-w-6xl mx-auto">
          {/* Hospital Info */}
          <Card className="shadow-soft border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Hospital className="h-5 w-5 text-primary" />
                Hospital Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-2xl text-primary mb-1">{hospital?.name}</h3>
              </div>
              <div className="flex items-start gap-3 text-muted-foreground">
                <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span>{hospital?.address}</span>
              </div>
              {hospital?.contact_phone && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="h-5 w-5" />
                  <span>{hospital.contact_phone}</span>
                </div>
              )}
              {hospital?.contact_email && (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Mail className="h-5 w-5" />
                  <span>{hospital.contact_email}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Waiting List Management */}
          <Card className="shadow-soft border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Users className="h-5 w-5 text-primary" />
                Waiting List
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-8">
                <div className="text-6xl font-bold text-primary mb-3">
                  {waitingList?.waiting_count || 0}
                </div>
                <p className="text-lg text-muted-foreground">
                  Patients currently waiting
                </p>
                {waitingList?.last_updated && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Last updated: {new Date(waitingList.last_updated).toLocaleString()}
                  </p>
                )}
              </div>

              <Separator className="mb-8" />

              <div className="flex gap-3 justify-center">
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => updateWaitingCount(-1)}
                  disabled={!waitingList || waitingList.waiting_count <= 0}
                  className="gap-2 h-14 px-6"
                >
                  <Minus className="h-5 w-5" />
                  Remove
                </Button>
                <Button 
                  size="lg"
                  onClick={() => updateWaitingCount(1)}
                  className="gap-2 h-14 px-6"
                >
                  <Plus className="h-5 w-5" />
                  Add Patient
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* QR Code Section */}
          <Card className="lg:col-span-2 shadow-soft border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <QrCode className="h-5 w-5 text-primary" />
                Patient Self Check-in
              </CardTitle>
              <CardDescription className="text-base">
                Display this QR code at your reception for automatic check-ins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm font-semibold text-primary">1</span>
                    </div>
                    <p className="text-muted-foreground">Display this QR code at your hospital reception desk</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm font-semibold text-primary">2</span>
                    </div>
                    <p className="text-muted-foreground">Patients scan the code with their smartphone camera</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-sm font-semibold text-primary">3</span>
                    </div>
                    <p className="text-muted-foreground">Waiting list automatically increases - no staff input needed</p>
                  </div>
                </div>
                <div className="bg-white p-8 rounded-2xl shadow-soft-lg border">
                  {hospital && (
                    <QRCode 
                      value={`${window.location.origin}/scan/${hospital.id}`}
                      size={220}
                      className="mx-auto"
                    />
                  )}
                  <p className="text-sm text-center mt-4 text-muted-foreground font-medium">
                    Scan to join waiting list
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
