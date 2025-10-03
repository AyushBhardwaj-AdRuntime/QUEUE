import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hospital, MapPin, Clock, Users, ArrowRight, Search } from "lucide-react";

interface Hospital {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  contact_phone: string | null;
  contact_email: string | null;
  waiting_lists?: {
    waiting_count: number;
    last_updated: string;
  }[];
}

const Index = () => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHospitals();
  }, []);

  const fetchHospitals = async () => {
    const { data, error } = await supabase
      .from("hospitals")
      .select(`
        *,
        waiting_lists (
          waiting_count,
          last_updated
        )
      `)
      .order("name");

    if (error) {
      console.error("Error fetching hospitals:", error);
    } else {
      setHospitals(data || []);
    }
    setLoading(false);
  };

  const filteredHospitals = hospitals.filter(hospital =>
    hospital.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    hospital.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getWaitingCount = (hospital: Hospital) => {
    return hospital.waiting_lists?.[0]?.waiting_count || 0;
  };

  const getWaitBadgeVariant = (count: number) => {
    if (count === 0) return "default";
    if (count <= 5) return "secondary";
    if (count <= 10) return "outline";
    return "destructive";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Hero Section */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Hospital className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
              WaitWatcher
            </h1>
          </div>
          <Button onClick={() => navigate("/auth")} variant="outline" className="gap-2">
            Hospital Login
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Hero Content */}
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Find the Nearest Hospital
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Check real-time waiting lists and make informed decisions about your healthcare
          </p>

          {/* Search Bar */}
          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by hospital name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-14 text-lg shadow-soft"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
          <Card className="border-primary/20 shadow-soft hover:shadow-soft-lg transition-shadow">
            <CardContent className="pt-6 text-center">
              <Hospital className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-3xl font-bold text-primary">{hospitals.length}</div>
              <p className="text-sm text-muted-foreground">Hospitals Listed</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-soft hover:shadow-soft-lg transition-shadow">
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-3xl font-bold text-primary">
                {hospitals.reduce((acc, h) => acc + getWaitingCount(h), 0)}
              </div>
              <p className="text-sm text-muted-foreground">Total Waiting</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20 shadow-soft hover:shadow-soft-lg transition-shadow">
            <CardContent className="pt-6 text-center">
              <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
              <div className="text-3xl font-bold text-primary">Live</div>
              <p className="text-sm text-muted-foreground">Real-time Updates</p>
            </CardContent>
          </Card>
        </div>

        {/* Hospitals List */}
        <div className="max-w-5xl mx-auto">
          <h3 className="text-2xl font-semibold mb-6 flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            Available Hospitals
          </h3>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 bg-muted rounded w-full"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredHospitals.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Hospital className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-lg text-muted-foreground">
                  {searchQuery ? "No hospitals found matching your search" : "No hospitals available yet"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              {filteredHospitals.map((hospital) => {
                const waitingCount = getWaitingCount(hospital);
                return (
                  <Card 
                    key={hospital.id} 
                    className="hover:shadow-soft-lg transition-all duration-300 border-primary/10 hover:border-primary/30"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2 flex items-center gap-2">
                            <Hospital className="h-5 w-5 text-primary" />
                            {hospital.name}
                          </CardTitle>
                          <CardDescription className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            <span>{hospital.address}</span>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Waiting:</span>
                        </div>
                        <Badge variant={getWaitBadgeVariant(waitingCount)} className="text-base px-4 py-1">
                          {waitingCount} {waitingCount === 1 ? "patient" : "patients"}
                        </Badge>
                      </div>
                      {hospital.waiting_lists?.[0]?.last_updated && (
                        <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Updated {new Date(hospital.waiting_lists[0].last_updated).toLocaleString()}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8 bg-card/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 WaitWatcher. Real-time hospital waiting list information.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
