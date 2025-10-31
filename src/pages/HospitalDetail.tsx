import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Hospital, MapPin, Phone, Mail, Users, Clock, ArrowLeft, Navigation } from "lucide-react";

interface HospitalData {
  id: string;
  name: string;
  address: string;
  pincode: string | null;
  latitude: number | null;
  longitude: number | null;
  contact_phone: string | null;
  contact_email: string | null;
  waiting_lists?: {
    waiting_count: number;
    last_updated: string;
  }[];
}

const HospitalDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [hospital, setHospital] = useState<HospitalData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHospitalDetail();
  }, [id]);

  const fetchHospitalDetail = async () => {
    if (!id) return;

    const { data, error } = await supabase
      .from("hospitals")
      .select(`
        *,
        waiting_lists (
          waiting_count,
          last_updated
        )
      `)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching hospital:", error);
    } else {
      setHospital(data);
    }
    setLoading(false);
  };

  const getWaitingCount = () => {
    return hospital?.waiting_lists?.[0]?.waiting_count || 0;
  };

  const getWaitBadgeVariant = (count: number) => {
    if (count === 0) return "default";
    if (count <= 5) return "secondary";
    if (count <= 10) return "outline";
    return "destructive";
  };

  const openInMaps = () => {
    if (hospital?.latitude && hospital?.longitude) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${hospital.latitude},${hospital.longitude}`, '_blank');
    } else if (hospital?.address) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hospital.address)}`, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="text-center">
          <Hospital className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading hospital details...</p>
        </div>
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <div className="text-center">
          <Hospital className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">Hospital not found</p>
          <Button onClick={() => navigate("/")}>Go Back</Button>
        </div>
      </div>
    );
  }

  const waitingCount = getWaitingCount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Hospitals
          </Button>
          <div className="flex items-center gap-2">
            <Hospital className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">WaitWatcher</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Hospital Header */}
          <Card className="shadow-soft-lg border-primary/20">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-3xl mb-3 flex items-center gap-3">
                    <Hospital className="h-8 w-8 text-primary" />
                    {hospital.name}
                  </CardTitle>
                </div>
                <Badge variant={getWaitBadgeVariant(waitingCount)} className="text-lg px-4 py-2">
                  {waitingCount} waiting
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Waiting Information */}
          <Card className="shadow-soft border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Current Waiting List
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <div className="text-5xl font-bold text-primary mb-2">
                  {waitingCount}
                </div>
                <p className="text-lg text-muted-foreground">
                  {waitingCount === 1 ? "patient" : "patients"} currently waiting
                </p>
                {hospital.waiting_lists?.[0]?.last_updated && (
                  <p className="text-sm text-muted-foreground mt-3 flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4" />
                    Last updated: {new Date(hospital.waiting_lists[0].last_updated).toLocaleString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Location & Contact */}
          <Card className="shadow-soft border-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Location & Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Address</p>
                  <p className="text-muted-foreground">{hospital.address}</p>
                  {hospital.pincode && (
                    <p className="text-sm text-muted-foreground mt-1">Pincode: {hospital.pincode}</p>
                  )}
                </div>
              </div>

              <Separator />

              {hospital.contact_phone && (
                <>
                  <div className="flex items-center gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Phone</p>
                      <a href={`tel:${hospital.contact_phone}`} className="text-primary hover:underline">
                        {hospital.contact_phone}
                      </a>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {hospital.contact_email && (
                <>
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Email</p>
                      <a href={`mailto:${hospital.contact_email}`} className="text-primary hover:underline">
                        {hospital.contact_email}
                      </a>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              <Button onClick={openInMaps} className="w-full gap-2">
                <Navigation className="h-4 w-4" />
                Open in Maps
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default HospitalDetail;
