import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Hospital, Users } from "lucide-react";

const ScanQueue = () => {
  const { hospitalId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [hospitalName, setHospitalName] = useState("");
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    const incrementWaitingList = async () => {
      if (!hospitalId) return;

      // Get hospital details
      const { data: hospital, error: hospitalError } = await supabase
        .from("hospitals")
        .select("name")
        .eq("id", hospitalId)
        .single();

      if (hospitalError || !hospital) {
        setLoading(false);
        return;
      }

      setHospitalName(hospital.name);

      // Get current waiting list
      const { data: waitingList, error: waitingError } = await supabase
        .from("waiting_lists")
        .select("*")
        .eq("hospital_id", hospitalId)
        .single();

      if (waitingError || !waitingList) {
        setLoading(false);
        return;
      }

      // Increment the count
      const { error: updateError } = await supabase
        .from("waiting_lists")
        .update({ 
          waiting_count: waitingList.waiting_count + 1,
          last_updated: new Date().toISOString()
        })
        .eq("hospital_id", hospitalId);

      if (!updateError) {
        setNewCount(waitingList.waiting_count + 1);
        setSuccess(true);
      }

      setLoading(false);
    };

    incrementWaitingList();
  }, [hospitalId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Hospital className="h-12 w-12 mx-auto mb-4 text-primary animate-pulse" />
              <p>Processing your check-in...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Unable to Check In</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              We couldn't process your check-in. Please try again or contact the hospital staff.
            </p>
            <Button onClick={() => navigate("/")}>
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            Check-In Successful
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div>
            <Hospital className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h3 className="font-semibold text-xl mb-2">{hospitalName}</h3>
            <p className="text-muted-foreground">
              You have been added to the waiting list
            </p>
          </div>

          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="h-5 w-5 text-primary" />
              <span className="text-sm text-muted-foreground">Current Position</span>
            </div>
            <div className="text-4xl font-bold text-primary">
              {newCount}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Please wait for your turn. Hospital staff will call you when ready.
          </p>

          <Button onClick={() => navigate("/")} className="w-full">
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScanQueue;
