import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { LogOut, Hospital, MapPin, Phone, Mail, Users, Plus, Minus, QrCode } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import QRCode from "react-qr-code";

interface Hospital {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
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

  // Hospital form state
  const [hospitalForm, setHospitalForm] = useState({
    name: "",
    address: "",
    latitude: "",
    longitude: "",
    contact_phone: "",
    contact_email: "",
  });

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
      
      // Fetch waiting list data
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

  const createHospital = async () => {
    if (!user || !hospitalForm.name || !hospitalForm.address || !hospitalForm.latitude || !hospitalForm.longitude) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from("hospitals")
      .insert([{
        name: hospitalForm.name,
        address: hospitalForm.address,
        latitude: parseFloat(hospitalForm.latitude),
        longitude: parseFloat(hospitalForm.longitude),
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Hospital className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (isCreating) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold">Create Hospital Profile</h1>
              <p className="text-muted-foreground">Set up your hospital information</p>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Hospital Information</CardTitle>
              <CardDescription>
                Enter your hospital details to get started
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Input
                  placeholder="Hospital Name *"
                  value={hospitalForm.name}
                  onChange={(e) => setHospitalForm({...hospitalForm, name: e.target.value})}
                />
              </div>
              <div>
                <Input
                  placeholder="Full Address *"
                  value={hospitalForm.address}
                  onChange={(e) => setHospitalForm({...hospitalForm, address: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Latitude *"
                  type="number"
                  step="any"
                  value={hospitalForm.latitude}
                  onChange={(e) => setHospitalForm({...hospitalForm, latitude: e.target.value})}
                />
                <Input
                  placeholder="Longitude *"
                  type="number"
                  step="any"
                  value={hospitalForm.longitude}
                  onChange={(e) => setHospitalForm({...hospitalForm, longitude: e.target.value})}
                />
              </div>
              <div>
                <Input
                  placeholder="Contact Phone"
                  value={hospitalForm.contact_phone}
                  onChange={(e) => setHospitalForm({...hospitalForm, contact_phone: e.target.value})}
                />
              </div>
              <div>
                <Input
                  placeholder="Contact Email"
                  type="email"
                  value={hospitalForm.contact_email}
                  onChange={(e) => setHospitalForm({...hospitalForm, contact_email: e.target.value})}
                />
              </div>
              <Button onClick={createHospital} className="w-full">
                Create Hospital Profile
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Hospital Dashboard</h1>
            <p className="text-muted-foreground">Manage your waiting list</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/")}>
              View Public
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Hospital Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Hospital className="h-5 w-5" />
                Hospital Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{hospital?.name}</h3>
              </div>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 mt-0.5" />
                <span>{hospital?.address}</span>
              </div>
              {hospital?.contact_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4" />
                  <span>{hospital.contact_phone}</span>
                </div>
              )}
              {hospital?.contact_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4" />
                  <span>{hospital.contact_email}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Waiting List Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Waiting List Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-primary mb-2">
                  {waitingList?.waiting_count || 0}
                </div>
                <p className="text-sm text-muted-foreground">
                  Patients currently waiting
                </p>
                {waitingList?.last_updated && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Last updated: {new Date(waitingList.last_updated).toLocaleString()}
                  </p>
                )}
              </div>

              <Separator className="mb-6" />

              <div className="flex gap-2 justify-center">
                <Button 
                  variant="outline" 
                  size="lg"
                  onClick={() => updateWaitingCount(-1)}
                  disabled={!waitingList || waitingList.waiting_count <= 0}
                >
                  <Minus className="h-4 w-4 mr-2" />
                  Remove Patient
                </Button>
                <Button 
                  size="lg"
                  onClick={() => updateWaitingCount(1)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Patient
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* QR Code for Patient Check-in */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Patient Check-in QR Code
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">How it works:</h3>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>1. Display this QR code at your hospital reception</li>
                    <li>2. Patients scan the QR code with their phone</li>
                    <li>3. The waiting list automatically increases by 1</li>
                    <li>4. No manual entry required!</li>
                  </ul>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm">
                  {hospital && (
                    <QRCode 
                      value={`${window.location.origin}/scan/${hospital.id}`}
                      size={200}
                    />
                  )}
                  <p className="text-xs text-center mt-2 text-muted-foreground">
                    Scan to join waiting list
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;