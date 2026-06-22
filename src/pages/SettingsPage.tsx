import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { listAppUsers, createAppUser, deleteAppUser } from "@/dataconnect-generated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Trash2, UserPlus, Loader2 } from "lucide-react";
import { Navigate } from "react-router-dom";

export default function SettingsPage() {
  const { appUser } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (appUser?.role === "admin") {
      fetchUsers();
    }
  }, [appUser]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await listAppUsers();
      setUsers(res.data.appUserss || []);
    } catch (error) {
      console.error("Failed to fetch users", error);
      toast.error("Failed to load users list.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newEmail || !newEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }

    try {
      setAdding(true);
      await createAppUser({
        email: newEmail.toLowerCase(),
        role: newRole,
        addedBy: appUser?.email || "unknown",
      });
      toast.success("User added successfully.");
      setNewEmail("");
      setNewRole("user");
      fetchUsers();
    } catch (error: any) {
      console.error("Failed to add user", error);
      if (error.message && error.message.includes("already exists")) {
        toast.error("User already exists.");
      } else {
        toast.error("Failed to add user.");
      }
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteUser = async (id: string, email: string) => {
    if (email === appUser?.email) {
      toast.error("You cannot remove yourself.");
      return;
    }
    
    if (!confirm(`Are you sure you want to remove ${email}?`)) return;

    try {
      await deleteAppUser({ id });
      toast.success("User removed successfully.");
      fetchUsers();
    } catch (error) {
      console.error("Failed to delete user", error);
      toast.error("Failed to remove user.");
    }
  };

  if (appUser?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage application permissions and user access.</p>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold mb-4">Add User</h2>
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@billiondollarboy.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="w-48 space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddUser} disabled={adding}>
              {adding ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Add User
            </Button>
          </div>
        </div>

        <div className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Added By</TableHead>
                <TableHead>Date Added</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {user.role}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.addedBy || '-'}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteUser(user.id, user.email)}
                        disabled={user.email === appUser.email}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
