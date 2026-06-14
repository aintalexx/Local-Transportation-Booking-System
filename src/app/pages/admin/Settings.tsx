import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { toast } from "sonner";

export default function AdminSettings() {
  const handleSave = () => {
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
                <Input id="tricycle-base" type="number" defaultValue="30" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ebike-base">E-Bike Base Fare (₱)</Label>
                <Input id="ebike-base" type="number" defaultValue="25" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="per-km">Per Kilometer (₱)</Label>
                <Input id="per-km" type="number" defaultValue="8" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-fee">Service Fee (%)</Label>
                <Input id="service-fee" type="number" defaultValue="10" />
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
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Approve Drivers</Label>
                <p className="text-sm text-gray-600">Automatically approve driver registrations</p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Cancellations</Label>
                <p className="text-sm text-gray-600">Allow passengers to cancel bookings</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Real-time Tracking</Label>
                <p className="text-sm text-gray-600">Enable live location tracking</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Configure notification settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Driver Approval Alerts</Label>
                <p className="text-sm text-gray-600">Notify when new drivers register</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Booking Notifications</Label>
                <p className="text-sm text-gray-600">Send alerts for new bookings</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline">Reset to Default</Button>
          <Button onClick={handleSave}>Save Settings</Button>
        </div>
      </div>
    </div>
  );
}
