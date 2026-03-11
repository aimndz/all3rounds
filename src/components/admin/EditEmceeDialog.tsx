import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface EmceeAdmin {
  id: string;
  name: string;
}

interface EditEmceeDialogProps {
  emcee: EmceeAdmin | null;
  onClose: () => void;
  onSave: (id: string, newName: string) => Promise<void>;
}

export function EditEmceeDialog({
  emcee,
  onClose,
  onSave,
}: EditEmceeDialogProps) {
  const [editName, setEditName] = useState("");

  const handleSave = async () => {
    if (!emcee) return;
    await onSave(emcee.id, editName || emcee.name);
    setEditName("");
    onClose();
  };

  const handleClose = () => {
    setEditName("");
    onClose();
  };

  const currentValue = editName || (emcee ? emcee.name : "");

  return (
    <Dialog
      open={!!emcee}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent
        key={emcee?.id || "empty"}
        className="border-white/10 bg-[#141417] p-8 sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tighter uppercase">
            Rename Emcee
          </DialogTitle>
          <DialogDescription className="font-medium text-white/40">
            This will update the emcee&apos;s name everywhere they are
            referenced in the database.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <Input
            value={currentValue}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="New Name"
            className="focus-visible:ring-primary h-14 border-white/10 bg-white/5 px-6 text-xl font-semibold"
            autoFocus
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="h-11 px-8 text-[10px] font-semibold tracking-widest text-white/40 uppercase transition-all hover:bg-white/5 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={
              !currentValue.trim() || currentValue.trim() === emcee?.name
            }
            className="bg-primary hover:bg-primary/90 h-11 rounded-xl px-8 text-[10px] font-semibold tracking-widest text-black uppercase transition-all active:scale-95"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
