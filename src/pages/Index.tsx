import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Search, MapPin, Clock, Hospital, Settings } from "lucide-react";

interface HospitalWithWaiting {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  contact_phone: string | null;
  contact_email: string | null;
  waiting_count: number;
  last_updated: string;
}

const Index = () => {
  const [hospitals, setHospitals] = useState<HospitalWithWaiting[]>([]);
  const [searchLocation, setSearchLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<"distance" | "waiting">("waiting");

  useEffect(() => {
    fetchAllHospitals();
  }, []);

  const fetchAllHospitals = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("hospitals")
      .select(`
        *,
        waiting_lists!inner(waiting_count, last_updated)
      `);

    if (error) {
      console.error("Error fetching hospitals:", error);
      toast({
        title: "Error",
        description: "Failed to load hospitals",
        variant: "destructive",
      });
    } else {
      const hospitalsWithWaiting: HospitalWithWaiting[] = data.map((hospital: any) => ({
        ...hospital,
        waiting_count: hospital.waiting_lists[0]?.waiting_count || 0,
        last_updated: hospital.waiting_lists[0]?.last_updated || new Date().toISOString(),
      }));
      
      setHospitals(hospitalsWithWaiting);
    }
    setLoading(false);
  };

  const handleSearch = () => {
    if (!searchLocation.trim()) {
      toast({
        title: "Error",
        description: "Please enter a location to search",
        variant: "destructive",
      });
      return;
    }
    
    // In a real app, this would filter by location/distance
    fetchAllHospitals();
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setSearchLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          toast({
            title: "Location Found",
            description: "Using your current location",
          });
        },
        (error) => {
          toast({
            title: "Location Error",
            description: "Unable to get your location",
            variant: "destructive",
          });
        }
      );
    } else {
      toast({
        title: "Error",
        description: "Geolocation is not supported by this browser",
        variant: "destructive",
      });
    }
  };

  const sortedHospitals = [...hospitals].sort((a, b) => {
    if (sortBy === "waiting") {
      return a.waiting_count - b.waiting_count;
    }
    // For distance sorting, we'd calculate actual distance
    // For now, just sort by name as placeholder
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Hospital className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Hospital Waiting Lists</h1>
          </div>
          <p className="text-xl text-muted-foreground mb-6">
            Find nearby hospitals and check their current waiting times
          </p>
          
          <div className="flex justify-center mb-6">
            <Link to="/auth">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Hospital Staff Login
              </Button>
            </Link>
          </div>
        </div>

        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Find Hospitals Near You
            </CardTitle>
            <CardDescription>
              Enter your location or use GPS to find nearby hospitals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Enter pincode, city, or coordinates..."
                value={searchLocation}
                onChange={(e) => setSearchLocation(e.target.value)}
                className="flex-1"
              />
              <Button onClick={getCurrentLocation} variant="outline">
                <MapPin className="h-4 w-4" />
              </Button>
              <Button onClick={handleSearch}>Search</Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={sortBy === "waiting" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("waiting")}
              >
                Sort by Waiting Time
              </Button>
              <Button
                variant={sortBy === "distance" ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy("distance")}
              >
                Sort by Distance
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <div className="text-center py-8">
            <Hospital className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
            <p>Loading hospitals...</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedHospitals.map((hospital) => (
              <Card key={hospital.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{hospital.name}</CardTitle>
                    <Badge 
                      variant={hospital.waiting_count <= 5 ? "default" : hospital.waiting_count <= 15 ? "secondary" : "destructive"}
                      className="ml-2"
                    >
                      {hospital.waiting_count} waiting
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2 text-sm">
                      <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <span className="text-muted-foreground">{hospital.address}</span>
                    </div>
                    
                    {hospital.contact_phone && (
                      <div className="text-sm">
                        <strong>Phone:</strong> {hospital.contact_phone}
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        Updated: {new Date(hospital.last_updated).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && sortedHospitals.length === 0 && (
          <div className="text-center py-8">
            <Hospital className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No hospitals found. Try a different location.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
