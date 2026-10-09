import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ProfileSearch({ onSubmit, isBusy, size = "default", className }) {
  const [value, setValue] = useState("");
  const large = size === "large";

  const handleSubmit = (event) => {
    event.preventDefault();
    if (value.trim()) onSubmit(value.trim());
  };

  return (
    <form onSubmit={handleSubmit} className={cn("flex w-full gap-2", className)} role="search">
      <label htmlFor={`profile-search-${size}`} className="sr-only">
        Steam profile
      </label>
      <Input
        id={`profile-search-${size}`}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={large ? "Profile link, custom URL name, or SteamID64" : "Look up another profile"}
        autoComplete="off"
        spellCheck={false}
        className={large ? "h-12 text-base" : "h-10 text-base sm:h-9 sm:text-sm"}
      />
      <Button type="submit" disabled={isBusy || !value.trim()} size={large ? "default" : "sm"} className={large ? "h-12 px-6" : "h-10 sm:h-9"}>
        {isBusy ? "Looking up…" : "Look up"}
      </Button>
    </form>
  );
}
