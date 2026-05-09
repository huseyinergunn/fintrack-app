import { Sidebar } from '@/components/Sidebar';
import { ToastProvider } from '@/components/ui/toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </ToastProvider>
  );
}
