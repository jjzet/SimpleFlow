import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BookmarkIcon } from 'lucide-react';
import { ManageScopesModal } from '@/components/workflow/modals/manage-scopes-modal';

interface ManageScopesButtonProps {
  className?: string;
}

export function ManageScopesButton({ className }: ManageScopesButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={className}
        onClick={() => setIsModalOpen(true)}
      >
        <BookmarkIcon className="mr-2 h-4 w-4" />
        Manage Favorite Scopes
      </Button>

      <ManageScopesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
