import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PAGE_SIZES } from "@/hooks/useGameFilters";

export function Pagination({ page, pageCount, pageSize, total, rangeStart, rangeEnd, onPageChange, onPageSizeChange }) {
  if (total === 0) return null;

  return (
    <nav className="flex flex-wrap items-center justify-between gap-4 pt-8 text-sm" aria-label="Pagination">
      <p className="text-muted-foreground">
        Showing {rangeStart}–{rangeEnd} of {total.toLocaleString()} games
      </p>
      <div className="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {pageSize} per page
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {PAGE_SIZES.map((size) => (
              <DropdownMenuItem key={size} onSelect={() => onPageSizeChange(size)}>
                {size} per page
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[6.5rem] text-center tabular-nums text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <Button variant="ghost" size="icon" onClick={() => onPageChange(page + 1)} disabled={page >= pageCount} aria-label="Next page">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
