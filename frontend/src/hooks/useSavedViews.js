import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { createFilterConfiguration } from "@/hooks/useGameFilters";

const byName = (a, b) => a.name.localeCompare(b.name);

/**
 * Named filter views stored per profile. Restores the last selected one on load, unless
 * the page was opened from a shared link (`restoreSelection: false`), which wins.
 * On someone else's profile (`readOnly`) their views can be applied, but nothing is saved.
 */
export function useSavedViews(steamId, filters, { restoreSelection = true, readOnly = false } = {}) {
  const { applyConfiguration, clearFilters } = filters;
  const [views, setViews] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.getSavedViews(steamId)
      .then((loaded) => {
        if (cancelled) return;
        setViews(loaded);
        const selected = restoreSelection ? loaded.find((view) => view.isSelected) : null;
        if (selected) {
          setSelectedId(selected.id);
          applyConfiguration(selected.configuration);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(`Saved views couldn't be loaded: ${e.message}`);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
    // restoreSelection only matters for the first load of a profile.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steamId, applyConfiguration]);

  const select = useCallback(async (id) => {
    setError("");
    if (readOnly) {
      setSelectedId(id || "");
      const view = views.find((item) => item.id === id);
      if (view) applyConfiguration(view.configuration);
      else clearFilters();
      return;
    }
    try {
      const updated = await api.selectSavedView(steamId, id || null);
      setViews(updated);
      setSelectedId(id || "");
      const view = updated.find((item) => item.id === id);
      if (view) applyConfiguration(view.configuration);
      else clearFilters();
    } catch (e) {
      setError(`Saved view couldn't be selected: ${e.message}`);
    }
  }, [steamId, readOnly, views, applyConfiguration, clearFilters]);

  /** Forget the selected view but keep the current filters (e.g. when a preset is applied). */
  const deselect = useCallback(async () => {
    if (!selectedId) return;
    setSelectedId("");
    if (readOnly) return;
    try {
      setViews(await api.selectSavedView(steamId, null));
    } catch (e) {
      setError(`Saved view selection couldn't be cleared: ${e.message}`);
    }
  }, [steamId, selectedId, readOnly]);

  /** Returns true when saved, so the caller can reset its form. */
  const saveAs = async (name) => {
    setError("");
    try {
      const saved = await api.createSavedView(steamId, { name, configuration: createFilterConfiguration(filters) });
      setViews((current) => [...current.map((view) => ({ ...view, isSelected: false })), saved].sort(byName));
      setSelectedId(saved.id);
      return true;
    } catch (e) {
      setError(`Saved view couldn't be saved: ${e.message}`);
      return false;
    }
  };

  const updateSelected = async () => {
    const view = views.find((item) => item.id === selectedId);
    if (!view) return;
    setError("");
    try {
      const updated = await api.updateSavedView(steamId, view.id, {
        name: view.name,
        configuration: createFilterConfiguration(filters),
      });
      setViews((current) => current.map((item) => (item.id === updated.id ? { ...item, ...updated, isSelected: true } : item)));
    } catch (e) {
      setError(`Saved view couldn't be updated: ${e.message}`);
    }
  };

  const deleteSelected = async () => {
    if (!selectedId) return;
    setError("");
    try {
      await api.deleteSavedView(steamId, selectedId);
      setViews((current) => current.filter((view) => view.id !== selectedId));
      setSelectedId("");
      clearFilters();
    } catch (e) {
      setError(`Saved view couldn't be deleted: ${e.message}`);
    }
  };

  return {
    views,
    selectedView: views.find((view) => view.id === selectedId) ?? null,
    isLoading,
    error,
    dismissError: () => setError(""),
    select,
    deselect,
    saveAs,
    updateSelected,
    deleteSelected,
  };
}
