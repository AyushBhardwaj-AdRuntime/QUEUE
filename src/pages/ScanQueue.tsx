import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Hospital, Users, ArrowLeft } from "lucide-react";

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

      const { data: waitingList, error: waitingError } = await supabase
        .from("waiting_lists")
        .select("*")
        .eq("hospital_id", hospitalId)
        .single();

      if (waitingError || !waitingList) {
        setLoading(false);
        return;
      }

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <Card className="w-full max-w-md shadow-soft-lg">
          <CardContent className="pt-12 pb-12">
            <div className="text-center">
              <Hospital className="h-16 w-16 mx-auto mb-6 text-primary animate-pulse" />
              <p className="text-lg text-muted-foreground">Processing your check-in...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
        <Card className="w-full max-w-md shadow-soft-lg">
          <CardHeader>
            <CardTitle className="text-center text-2xl">Unable to Check In</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6 pb-8">
            <p className="text-muted-foreground text-lg">
              We couldn't process your check-in. Please try again or contact the hospital staff.
            </p>
            <Button onClick={() => navigate("/")} size="lg" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <Card className="w-full max-w-md shadow-soft-lg border-primary/20">
        <CardHeader>
          <CardTitle className="text-center flex items-center justify-center gap-3 text-2xl">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="h-7 w-7 text-green-600" />
            </div>
            Check-In Successful
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-8 pb-8">
          <div>
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Hospital className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-semibold text-2xl mb-2 text-primary">{hospitalName}</h3>
            <p className="text-muted-foreground text-lg">
              You have been added to the waiting list
            </p>
          </div>

          <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-6 border border-primary/20">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Users className="h-6 w-6 text-primary" />
              <span className="text-muted-foreground font-medium">Your Position</span>
            </div>
            <div className="text-6xl font-bold text-primary">
              {newCount}
            </div>
          </div>

          <div className="bg-muted/50 rounded-xl p-4">
            <p className="text-sm text-muted-foreground">
              Please have a seat in the waiting area. Hospital staff will call you when it's your turn.
            </p>
          </div>

          <Button onClick={() => navigate("/")} size="lg" className="w-full gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScanQueue;
