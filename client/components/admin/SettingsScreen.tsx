import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function SettingsScreen() {
  const [hospitalName, setHospitalName] = useState("Riverside Community Hospital");
  const [hospitalAddress, setHospitalAddress] = useState("1200 Health Way, Metro City");
  const [hospitalPhone, setHospitalPhone] = useState("+1 (555) 010-0200");

  const [slotDurationMins, setSlotDurationMins] = useState(15);
  const [bufferMins, setBufferMins] = useState(5);
  const [smsEnabled, setSmsEnabled] = useState(true);

  const [adminEmail, setAdminEmail] = useState("admin@healthqueue.demo");
  const [newPassword, setNewPassword] = useState("");

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your changes have been stored locally for this demo session.",
    });
  };

  return (
    <div className="space-y-6">
      <p className="text-slate-600">Configure hospital profile, queue behavior, and account preferences.</p>

      <Tabs defaultValue="hospital" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto sm:h-10 gap-1 sm:gap-0 bg-slate-100 p-1">
          <TabsTrigger value="hospital" className="text-xs sm:text-sm">
            Hospital Profile
          </TabsTrigger>
          <TabsTrigger value="queue" className="text-xs sm:text-sm">
            Queue Rules
          </TabsTrigger>
          <TabsTrigger value="account" className="text-xs sm:text-sm">
            Account
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hospital" className="mt-6">
          <Card className="border-slate-200 shadow-sm bg-white max-w-2xl">
            <CardHeader>
              <CardTitle>Hospital profile</CardTitle>
              <CardDescription>Shown on receipts and patient notifications (demo placeholders).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hospital-name">Hospital name</Label>
                <Input
                  id="hospital-name"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="border-slate-200 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hospital-address">Address</Label>
                <Input
                  id="hospital-address"
                  value={hospitalAddress}
                  onChange={(e) => setHospitalAddress(e.target.value)}
                  className="border-slate-200 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hospital-phone">Phone</Label>
                <Input
                  id="hospital-phone"
                  type="tel"
                  value={hospitalPhone}
                  onChange={(e) => setHospitalPhone(e.target.value)}
                  className="border-slate-200 bg-white"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queue" className="mt-6">
          <Card className="border-slate-200 shadow-sm bg-white max-w-2xl">
            <CardHeader>
              <CardTitle>Queue rules</CardTitle>
              <CardDescription>Timing and notification defaults for the waiting list.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="slot-duration">Average slot duration (mins)</Label>
                <Input
                  id="slot-duration"
                  type="number"
                  min={5}
                  max={120}
                  value={slotDurationMins}
                  onChange={(e) => setSlotDurationMins(Number(e.target.value) || 0)}
                  className="border-slate-200 bg-white max-w-xs"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buffer-time">Buffer time between patients (mins)</Label>
                <Input
                  id="buffer-time"
                  type="number"
                  min={0}
                  max={60}
                  value={bufferMins}
                  onChange={(e) => setBufferMins(Number(e.target.value) || 0)}
                  className="border-slate-200 bg-white max-w-xs"
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-toggle" className="text-base font-medium text-slate-900">
                    Enable automated SMS notifications
                  </Label>
                  <p className="text-sm text-slate-500">Patients receive texts when their turn is near.</p>
                </div>
                <Switch id="sms-toggle" checked={smsEnabled} onCheckedChange={setSmsEnabled} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="mt-6">
          <Card className="border-slate-200 shadow-sm bg-white max-w-2xl">
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Administrator sign-in details (not connected to a real backend).</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="border-slate-200 bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="border-slate-200 bg-white"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 border-t border-slate-200">
        <Button type="button" className="bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto" onClick={handleSave}>
          Save Changes
        </Button>
        <p className="text-xs text-slate-500">Saves are mocked in the browser only.</p>
      </div>
    </div>
  );
}
