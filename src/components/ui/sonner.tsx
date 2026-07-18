import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "!bg-primary !text-primary-foreground hover:!bg-primary/90 focus-visible:!ring-2 focus-visible:!ring-ring",
          cancelButton: "!bg-muted !text-muted-foreground hover:!bg-muted/80",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
