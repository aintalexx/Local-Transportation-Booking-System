import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { toast } from "sonner";
import { firstInvalid, validatePercentage, validatePositiveMoney } from "../../utils/validators";

export default function AdminSettings() {
  const [fareSettings, setFareSettings] = useState({
    tricycleBase: "30",
    ebikeBase: "25",
    perKm: "8",
    serviceFee: "10",
  });

  const updateFareSetting = (key: keyof typeof fareSettings, value: string) => {
    setFareSettings(prev => ({
      ...prev,
      [key]: value.replace(/[^\d.]/g, ""),
    }));
  };

  const handleSave = () => {
    const fareCheck = firstInvalid([
      validatePositiveMoney(fareSettings.tricycleBase, "Tricycle base fare"),
      validatePositiveMoney(fareSettings.ebikeBase, "E-Bike base fare"),
      validatePositiveMoney(fareSettings.perKm, "Per kilometer fare"),
      validatePercentage(fareSettings.serviceFee, "Service fee"),
    ]);

    if (!fareCheck.valid) {
      toast.error(fareCheck.message);
      return;
    }

    toast.success("Settings saved successfully");
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600">Manage system configuration</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Fare Configuration</CardTitle>
            <CardDescription>Set base fares and pricing rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tricycle-base">Tricycle Base Fare (₱)</Label>
                <Input
                  id="tricycle-base"
                  type="number"
                  min="1"
                  step="1"
                  value={fareSettings.tricycleBase}
                  onChange={(e) => updateFareSetting("tricycleBase", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ebike-base">E-Bike Base Fare (₱)</Label>
                <Input
                  id="ebike-base"
                  type="number"
                  min="1"
                  step="1"
                  value={fareSettings.ebikeBase}
                  onChange={(e) => updateFareSetting("ebikeBase", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="per-km">Per Kilometer (₱)</Label>
                <Input
                  id="per-km"
                  type="number"
                  min="1"
                  step="1"
                  value={fareSettings.perKm}
                  onChange={(e) => updateFareSetting("perKm", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-fee">Service Fee (%)</Label>
                <Input
                  id="service-fee"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={fareSettings.serviceFee}
                  onChange={(e) => updateFareSetting("serviceFee", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
            <CardDescription>General system configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Label>Auto-Approve Drivers</Label>
                <p className="text-sm text-gray-600">Automatically approve driver registrations</p>
              </div>
              <Switch className="shrink-0" />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Label>Allow Cancellations</Label>
                <p className="text-sm text-gray-600">Allow passengers to cancel bookings</p>
              </div>
              <Switch className="shrink-0" defaultChecked />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Label>Real-time Tracking</Label>
                <p className="text-sm text-gray-600">Enable live location tracking</p>
              </div>
              <Switch className="shrink-0" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Configure notification settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Label>Driver Approval Alerts</Label>
                <p className="text-sm text-gray-600">Notify when new drivers register</p>
              </div>
              <Switch className="shrink-0" defaultChecked />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Label>Booking Notifications</Label>
                <p className="text-sm text-gray-600">Send alerts for new bookings</p>
              </div>
              <Switch className="shrink-0" defaultChecked />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline">Reset to Default</Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </div>
    </div>
  );
}
