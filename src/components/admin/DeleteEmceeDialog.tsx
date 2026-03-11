import { AlertTriangle, AlertCircle } from "lucide-react";
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

interface DeleteEmceeDialogProps {
  emcee: EmceeAdmin | null;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
}

export function DeleteEmceeDialog({
  emcee,
  onClose,
  onDelete,
}: DeleteEmceeDialogProps) {
  const handleDelete = async () => {
    if (!emcee) return;
    await onDelete(emcee.id);
    onClose();
  };

  return (
    <Dialog open={!!emcee} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="border-destructive/20 bg-[#141417] p-8 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-destructive flex items-center gap-2 text-2xl font-semibold tracking-tighter uppercase">
            <AlertTriangle className="h-6 w-6" />
            Delete Emcee
          </DialogTitle>
          <DialogDescription className="mt-2 text-base font-medium text-white/60">
            Are you sure you want to delete{" "}
            <strong className="font-semibold text-white">
              {`"${emcee?.name}"`}
            </strong>
            ?
          </DialogDescription>
        </DialogHeader>

        <div className="bg-destructive/10 border-destructive/20 mt-4 rounded-2xl border p-6">
          <p className="text-destructive mb-4 text-[10px] font-semibold tracking-[0.2em] uppercase">
            Warning:
          </p>
          <ul className="text-destructive/80 space-y-2 text-sm font-bold">
            <li className="flex items-center gap-2">
              <div className="bg-destructive h-1 w-1 rounded-full" />
              Removes attribution from <strong>
                {emcee?.battle_count}
              </strong>{" "}
              battles.
            </li>
            <li className="flex items-center gap-2">
              <div className="bg-destructive h-1 w-1 rounded-full" />
              <strong>{emcee?.line_count}</strong> lines will lose their emcee
              link.
            </li>
            <li className="flex items-center gap-2 pt-2 text-[10px] font-semibold tracking-widest uppercase">
              <AlertCircle className="h-3 w-3" /> This action is permanent.
            </li>
          </ul>
        </div>

        <DialogFooter className="mt-8 gap-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="h-11 rounded-xl px-8 text-[10px] font-semibold tracking-widest text-white/40 uppercase transition-all hover:bg-white/5 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            className="h-11 rounded-xl px-8 text-[10px] font-semibold tracking-widest uppercase transition-all active:scale-95"
          >
            Confirm Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
