import { useRef, useState } from "react";
import { Bookmark, Check, ChevronDown, Link2, Plus, Save, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PRESET_VIEWS } from "@/lib/presets";

export function SaveViewForm({ onSave, onCancel, defaultName = "" }) {
  const [name, setName] = useState(defaultName);
  const [isSaving, setIsSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setIsSaving(true);
    const saved = await onSave(trimmed);
    setIsSaving(false);
    if (saved) onCancel();
  };

  return (
    <form
      className="flex w-full flex-wrap items-center gap-2 rounded-card border border-border bg-card/70 p-2.5"
      onSubmit={submit}
      onKeyDown={(event) => event.key === "Escape" && onCancel()}
    >
      <label htmlFor="saved-view-name" className="sr-only">Name for saved view</label>
      <input
        id="saved-view-name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={80}
        placeholder="Name this view, e.g. Short backlog games"
        className="h-9 min-w-0 flex-1 basis-48 rounded-well border border-border-strong bg-abyss px-3 text-base placeholder:text-muted-foreground/70 sm:text-sm"
      />
      <div className="flex gap-2">
        <Button type="submit" variant="outline" size="sm" disabled={isSaving || !name.trim()}>
          <Save className="h-3.5 w-3.5" aria-hidden="true" />
          {isSaving ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/**
 * Saved views plus the built-in presets. The trigger names whichever is applied and marks
 * it once the filters drift from it. The "save as" form is rendered separately by SaveViewForm.
 */
export function SavedViewsMenu({ savedViews, activePreset, isModified, onApplyPreset, onClose, onStartSave, onCopyLink, readOnly = false, className }) {
  const { views, selectedView, isLoading, select, updateSelected, deleteSelected } = savedViews;
  // Radix returns focus to the trigger on close; send it to the name field instead when saving.
  const focusNameOnClose = useRef(false);
  const current = selectedView ?? activePreset;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={current ? "outline" : "dashed"}
          size="sm"
          disabled={isLoading}
          className={`h-10 max-w-full rounded-well sm:h-9 ${className ?? ""}`}
          aria-label={current ? `View: ${current.name}${isModified ? ", edited" : ""}. Change view` : "Views"}
        >
          {activePreset && !selectedView ? (
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          ) : (
            <Bookmark className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          )}
          <span className={current ? "truncate" : "hidden truncate sm:inline"}>{isLoading ? "Loading…" : current ? current.name : "Views"}</span>
          {current && isModified && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-status-problem" title="Edited" aria-hidden="true" />}
          <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-72"
        onCloseAutoFocus={(event) => {
          if (!focusNameOnClose.current) return;
          focusNameOnClose.current = false;
          event.preventDefault();
          document.getElementById("saved-view-name")?.focus();
        }}
      >
        <DropdownMenuLabel>{readOnly ? "Their views" : "Your views"}</DropdownMenuLabel>
        {views.length === 0 && (
          <p className="px-2.5 pb-2 text-xs text-muted-foreground">
            {readOnly ? "No saved views on this profile." : "Save your current filters and sort to come back to them later."}
          </p>
        )}
        {views.map((view) => (
          <DropdownMenuItem key={view.id} onSelect={() => select(view.id)} className="justify-between">
            <span className="truncate">{view.name}</span>
            {view.id === selectedView?.id && <Check className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
          </DropdownMenuItem>
        ))}
        {!readOnly && (
          <DropdownMenuItem
            onSelect={() => {
              focusNameOnClose.current = true;
              onStartSave();
            }}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
            Save current as new view…
          </DropdownMenuItem>
        )}
        {selectedView && !readOnly && (
          <>
            <DropdownMenuItem onSelect={updateSelected} disabled={!isModified}>
              <Save className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="truncate">Update “{selectedView.name}”</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={deleteSelected} className="text-status-abandoned focus:text-status-abandoned">
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="truncate">Delete “{selectedView.name}”</span>
            </DropdownMenuItem>
          </>
        )}
        {current && (
          <DropdownMenuItem onSelect={onClose}>
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Close view and clear filters
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={onCopyLink}>
          <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          Copy link to these filters
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Premade</DropdownMenuLabel>
        {PRESET_VIEWS.map((preset) => (
          <DropdownMenuItem key={preset.id} onSelect={() => onApplyPreset(preset)} className="items-start">
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                {preset.name}
                {preset.id === activePreset?.id && !selectedView && <Check className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
              </span>
              <span className="block text-xs text-muted-foreground">{preset.description}</span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
