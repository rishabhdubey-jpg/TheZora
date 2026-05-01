import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { approveStudio, blockStudio, renewStudioAccess } from "./actions";
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Calendar,
  Mail,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function HQMasterPage() {
  const session = await getSession();
  if (!session) redirect("/login?error=expired");

  const user = await prisma.studio.findFirst({
    where: { 
      email: session.email,
      isSuperAdmin: true 
    }
  });

  if (!user) {
    redirect("/");
  }

  // Fetch counts
  const activeCount = await prisma.studio.count({
    where: { accountStatus: "ACTIVE" },
  });
  const pendingCount = await prisma.studio.count({
    where: { accountStatus: "PENDING" },
  });
  const blockedCount = await prisma.studio.count({
    where: { accountStatus: "BLOCKED" },
  });

  // Fetch lists
  const pendingStudios = await prisma.studio.findMany({
    where: { accountStatus: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  const activeStudios = await prisma.studio.findMany({
    where: { accountStatus: "ACTIVE" },
    orderBy: { createdAt: "desc" },
  });

  const blockedStudios = await prisma.studio.findMany({
    where: { accountStatus: "BLOCKED" },
    orderBy: { createdAt: "desc" },
  });

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 space-y-12">
      {/* Header */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-white to-neutral-500 bg-clip-text text-transparent">
          HQ Master Control
        </h1>
        <p className="text-neutral-400">SaaS Platform Administration & Studio Governance</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Active Studios" 
          value={activeCount} 
          icon={<ShieldCheck className="w-6 h-6 text-emerald-400" />}
          description="Studios with full access"
        />
        <MetricCard 
          title="Pending Approvals" 
          value={pendingCount} 
          icon={<Clock className="w-6 h-6 text-amber-400" />}
          description="Waiting for verification"
        />
        <MetricCard 
          title="Expired Access" 
          value={blockedCount} 
          icon={<ShieldAlert className="w-6 h-6 text-red-400" />}
          description="Subscriptions requiring renewal"
        />
        <MetricCard 
          title="Total Ecosystem" 
          value={activeCount + pendingCount + blockedCount} 
          icon={<Users className="w-6 h-6 text-blue-400" />}
          description="Total registered studios"
        />
      </div>

      {/* Pending Approvals Table */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <UserPlus className="w-6 h-6 text-amber-400" />
          <h2 className="text-2xl font-semibold">Pending Approvals</h2>
        </div>
        
        <div className="overflow-hidden border border-white/10 rounded-2xl bg-neutral-900/50 backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4 text-sm font-medium text-neutral-400">Studio Name</th>
                <th className="px-6 py-4 text-sm font-medium text-neutral-400">Email</th>
                <th className="px-6 py-4 text-sm font-medium text-neutral-400">Join Date</th>
                <th className="px-6 py-4 text-sm font-medium text-neutral-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {pendingStudios.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-neutral-500 italic">
                    No pending studio requests at this time.
                  </td>
                </tr>
              ) : (
                pendingStudios.map((studio) => (
                  <tr key={studio.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-amber-500" />
                        </div>
                        <span>{studio.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-400">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3.5 h-3.5 opacity-50" />
                        <span>{studio.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-400">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-3.5 h-3.5 opacity-50" />
                        <span>{formatDate(studio.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <form action={approveStudio.bind(null, studio.id)}>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all"
                        >
                          Approve Studio
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Active Roster Table */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="w-6 h-6 text-emerald-400" />
          <h2 className="text-2xl font-semibold">Active Roster</h2>
        </div>
        
        <div className="overflow-hidden border border-white/10 rounded-2xl bg-neutral-900/50 backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4 text-sm font-medium text-neutral-400">Studio Name</th>
                <th className="px-6 py-4 text-sm font-medium text-neutral-400">Email</th>
                <th className="px-6 py-4 text-sm font-medium text-neutral-400">Join Date</th>
                <th className="px-6 py-4 text-sm font-medium text-neutral-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {activeStudios.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-neutral-500 italic">
                    No active studios found.
                  </td>
                </tr>
              ) : (
                activeStudios.map((studio) => (
                  <tr key={studio.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-emerald-500" />
                        </div>
                        <span>{studio.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-400">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3.5 h-3.5 opacity-50" />
                        <span>{studio.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-400">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-3.5 h-3.5 opacity-50" />
                        <span>{formatDate(studio.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <form action={blockStudio.bind(null, studio.id)}>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 mr-2" />
                          Block Access
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Expired Roster Table */}
      <section className="space-y-6">
        <div className="flex items-center space-x-3">
          <ShieldAlert className="w-6 h-6 text-red-400" />
          <h2 className="text-2xl font-semibold">Expired / Revoked Accounts</h2>
        </div>
        
        <div className="overflow-hidden border border-white/10 rounded-2xl bg-neutral-900/50 backdrop-blur-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                <th className="px-6 py-4 text-sm font-medium text-neutral-400">Studio Name</th>
                <th className="px-6 py-4 text-sm font-medium text-neutral-400">Email</th>
                <th className="px-6 py-4 text-sm font-medium text-neutral-400">Join Date</th>
                <th className="px-6 py-4 text-sm font-medium text-neutral-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {blockedStudios.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-neutral-500 italic">
                    No expired accounts at this time.
                  </td>
                </tr>
              ) : (
                blockedStudios.map((studio) => (
                  <tr key={studio.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-red-500" />
                        </div>
                        <span>{studio.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-400">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-3.5 h-3.5 opacity-50" />
                        <span>{studio.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-neutral-400">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-3.5 h-3.5 opacity-50" />
                        <span>{formatDate(studio.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <form action={renewStudioAccess.bind(null, studio.id)}>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                          Renew Access
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ title, value, icon, description }: { title: string; value: string | number; icon: React.ReactNode; description: string }) {
  return (
    <div className="relative group overflow-hidden border border-white/10 rounded-2xl bg-neutral-900/50 p-6 transition-all hover:border-white/20">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        {icon}
      </div>
      <div className="flex flex-col space-y-4">
        <div className="flex items-center space-x-2 text-neutral-400">
          {icon}
          <span className="text-sm font-medium">{title}</span>
        </div>
        <div className="space-y-1">
          <div className="text-3xl font-bold">{value}</div>
          <p className="text-xs text-neutral-500">{description}</p>
        </div>
      </div>
    </div>
  );
}
