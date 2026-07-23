import React, { useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Template } from '@/types/template';
import Image from 'next/image';
import { templateService } from '@/lib/services/template-service';

interface SaveTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    name: string,
    description: string,
    tags: string[],
    previewImageUrl: string | null
  ) => Promise<void>;
  isSaving?: boolean;
  template?: Template; // For editing existing templates
}

// Predefined tags
const PREDEFINED_TAGS = [
  'Has Workers',
  'Three Level Workflow',
  'Two Level Workflow',
  'Single Level Workflow',
  'Data Processing',
  'Approval Flow',
  'Exception Handling',
];

export function SaveTemplateModal({
  isOpen,
  onClose,
  onSave,
  isSaving = false,
  template,
}: SaveTemplateModalProps) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [selectedTags, setSelectedTags] = useState<string[]>(
    template?.tags || []
  );
  const [customTag, setCustomTag] = useState('');
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(
    template?.preview_image_url || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Reset form when modal opens/closes or template changes
  React.useEffect(() => {
    if (isOpen) {
      setName(template?.name || '');
      setDescription(template?.description || '');
      setSelectedTags(template?.tags || []);
      setPreviewImageUrl(template?.preview_image_url || null);
      setCustomTag('');
    }
  }, [isOpen, template]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags((prev) => [...prev, customTag.trim()]);
      setCustomTag('');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Image must be less than 2MB',
        variant: 'destructive',
      });
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsUploading(true);
      toast({
        title: 'Uploading image',
        description: 'Please wait while your image is being uploaded...',
      });

      console.log('Starting image upload process');
      const imageUrl = await templateService.uploadTemplateImage(file);
      console.log('Image upload successful, URL:', imageUrl);

      setPreviewImageUrl(imageUrl);
      toast({
        title: 'Image uploaded',
        description: 'Preview image has been uploaded successfully',
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: 'Upload failed',
        description:
          error instanceof Error
            ? `Error: ${error.message}`
            : 'There was an error uploading your image. Please try again.',
        variant: 'destructive',
      });

      // Clear the file input so the user can try again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Template name required',
        description: 'Please enter a name for your template.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await onSave(name, description, selectedTags, previewImageUrl);
      setName('');
      setDescription('');
      setSelectedTags([]);
      setPreviewImageUrl(null);
      setCustomTag('');
      onClose();
      toast({
        title: 'Template saved',
        description: 'Your workflow has been saved as a template.',
      });
    } catch (error) {
      toast({
        title: 'Error saving template',
        description:
          'There was an error saving your template. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="flex max-h-[90vh] flex-col sm:max-w-[600px]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {template ? 'Edit Template' : 'Save as Template'}
          </DialogTitle>
          <DialogDescription>
            {template
              ? 'Update your workflow template with a new name, description, and preview image'
              : 'Save your current workflow as a template for future use'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 overflow-y-auto py-4 pr-1">
          <div className="grid gap-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter template name..."
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this template is for..."
              rows={3}
            />
          </div>

          <div className="grid gap-2">
            <Label>Tags</Label>
            <div className="mb-2 flex flex-wrap gap-2">
              {PREDEFINED_TAGS.map((tag) => (
                <div key={tag} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tag-${tag}`}
                    checked={selectedTags.includes(tag)}
                    onCheckedChange={() => handleTagToggle(tag)}
                  />
                  <label
                    htmlFor={`tag-${tag}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {tag}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="Add custom tag..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddCustomTag();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddCustomTag}
                disabled={!customTag.trim()}
              >
                Add
              </Button>
            </div>
            {selectedTags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedTags.map((tag) => (
                  <div
                    key={tag}
                    className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleTagToggle(tag)}
                      className="text-secondary-foreground/70 hover:text-secondary-foreground"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="template-image">Preview Image</Label>
            {previewImageUrl ? (
              <div className="relative aspect-video w-full overflow-hidden rounded-md border">
                <Image
                  src={previewImageUrl}
                  alt="Template preview"
                  fill
                  unoptimized={true}
                  className="object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute right-2 top-2"
                  onClick={() => setPreviewImageUrl(null)}
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed p-4">
                <p className="text-sm text-muted-foreground">
                  Upload a preview image for your template
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Upload Image'}
                </Button>
              </div>
            )}
          </div>
        </div>
        <DialogFooter className="mt-2 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || isUploading}>
            {isSaving
              ? 'Saving...'
              : template
                ? 'Update Template'
                : 'Save Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
