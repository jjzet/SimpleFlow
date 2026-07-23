/*
  File: src/components/ui/confirm-dialog.tsx
  Description: This file implements a custom confirm dialog using the UI Dialog components. The useConfirmDialog hook returns a confirm function that shows a modal and resolves with the user's choice, and a ConfirmDialog component that is rendered in the app's component tree.
*/

'use client';

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

type ConfirmDialogProps = {
  open: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmDialogComponent({
  open,
  message,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="z-50">
        <DialogHeader>
          <DialogTitle>Confirm</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useConfirmDialog() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [resolver, setResolver] = useState<(value: boolean) => void>(
    () => () => {}
  );

  const confirm = useCallback((message: string): Promise<boolean> => {
    setMessage(message);
    setOpen(true);
    return new Promise((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setOpen(false);
    resolver(true);
  }, [resolver]);

  const handleCancel = useCallback(() => {
    setOpen(false);
    resolver(false);
  }, [resolver]);

  const ConfirmDialog = () => (
    <ConfirmDialogComponent
      open={open}
      message={message}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );

  return { confirm, ConfirmDialog };
}
