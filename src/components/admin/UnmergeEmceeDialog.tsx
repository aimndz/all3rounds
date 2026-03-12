import { Split, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface EmceeAdmin {
  id: string;
  name: string;
  battle_count: number;
  line_count: number;
}

interface UnmergeEmceeDialogProps {
  emcee: EmceeAdmin | null;
  akaName: string | null;
  onClose: () => void;
  onUnmerge: (sourceId: string, akaName: string) => Promise<void>;
}

export function UnmergeEmceeDialog({
  emcee,
  akaName,
  onClose,
  onUnmerge,
}: UnmergeEmceeDialogProps) {
  const handleUnmerge = async () => {
    if (!emcee || !akaName) return;
    await onUnmerge(emcee.id, akaName);
    onClose();
  };

  const isOpen = !!emcee && !!akaName;

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-emerald-500/20 bg-[#141417] p-8 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-semibold tracking-tighter text-emerald-500">
            <Split className="h-6 w-6" />
            Unmerge Emcee
          </DialogTitle>
          <DialogDescription className="mt-2 text-base font-medium text-white/60">
            Are you sure you want to extract{" "}
            <strong className="font-semibold text-white">
              {`"${akaName}"`}
            </strong>{" "}
            from{" "}
            <strong className="font-semibold text-white">
              {`"${emcee?.name}"`}
            </strong>{" "}
            into a separate emcee identity?
          </DialogDescription>
        </DialogHeader>

        <div className="bg-emerald-500/10 border-emerald-500/20 mt-4 rounded-2xl border p-6">
          <p className="mb-4 text-[10px] font-semibold tracking-[0.2em] text-emerald-500 uppercase">
            What happens:
          </p>
          <ul className="space-y-2 text-sm font-bold text-emerald-500/80">
            <li className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-emerald-500" />
              A new emcee named <strong>{akaName}</strong> will be created.
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1 w-1 rounded-full bg-emerald-500" />
              <strong>{akaName}</strong> will be removed from the AKA list of <strong>{emcee?.name}</strong>.
            </li>
            <li className="flex items-center gap-2 pt-2 text-[10px] font-semibold tracking-widest uppercase text-white/40">
              <AlertCircle className="h-3 w-3" /> Note: Battles and lines will
              remain attributed to {emcee?.name} and must be manually reassigned
              if needed.
            </li>
          </ul>
        </div>

        <DialogFooter className="mt-8 gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="hover:text-white transition-all hover:bg-white/5 uppercase tracking-widest font-semibold text-[10px] px-8 rounded-xl h-11 text-white/40"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUnmerge}
            className="uppercase tracking-widest font-semibold text-[10px] px-8 rounded-xl h-11 transition-all active:scale-95 bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_30px_rgba(16,185,129,0.2)]"
          >
            Confirm Unmerge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
