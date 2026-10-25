import * as React from "react"
import { cn } from "cn"
import { ChevronDownIcon } from "lucide-react"

function NativeSelect({
  className,
  size = "default",
  ...props
}: Omit<React.ComponentProps<"select">, "size"> & { size?: "sm" | "default" }) {
  return (
    <div
      className="group/native-select relative w-full min-w-0 has-[select:disabled]:opacity-50"
      data-slot="native-select-wrapper"
    >
      <select
        data-slot="native-select"
        data-size={size}
        className={cn(
          "w-full min-w-0 appearance-none rounded-lg border border-input bg-card text-card-foreground px-3 py-2 pr-9 text-sm leading-normal shadow-xs transition-[color,box-shadow,border-color] outline-none",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40",
          "disabled:pointer-events-none disabled:cursor-not-allowed",
          "dark:border-border dark:bg-[#1a221d] dark:text-[#f0f5f2] dark:hover:bg-[#202923]",
          size === "sm" ? "h-8 min-h-[32px] text-xs py-1" : "h-10 min-h-[40px] text-sm",
          className
        )}
        {...props}
      />
      <ChevronDownIcon
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground opacity-70 select-none"
        aria-hidden="true"
        data-slot="native-select-icon"
      />
    </div>
  )
}

function NativeSelectOption({
  className,
  ...props
}: React.ComponentProps<"option">) {
  return (
    <option
      data-slot="native-select-option"
      className={cn("bg-white text-zinc-900 dark:bg-[#1a221d] dark:text-[#f0f5f2]", className)}
      {...props}
    />
  )
}

function NativeSelectOptGroup({
  className,
  ...props
}: React.ComponentProps<"optgroup">) {
  return (
    <optgroup
      data-slot="native-select-optgroup"
      className={cn("bg-white text-zinc-900 dark:bg-[#1a221d] dark:text-[#f0f5f2]", className)}
      {...props}
    />
  )
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }

