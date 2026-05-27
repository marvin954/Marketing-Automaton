import { useListBusinesses, useCreateBusiness, useDeleteBusiness } from "@workspace/api-client-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Building2, Globe, Target, Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const formSchema = z.object({
  name: z.string().min(2),
  industry: z.string().min(2),
  description: z.string().min(10),
  website: z.string().url().optional().or(z.literal("")),
  targetAudience: z.string().optional()
});

export default function Businesses() {
  const { data: businesses, isLoading } = useListBusinesses();
  const createMutation = useCreateBusiness();
  const deleteMutation = useDeleteBusiness();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "", industry: "", description: "", website: "", targetAudience: ""
    }
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    createMutation.mutate({ data: values }, {
      onSuccess: () => {
        toast({ title: "Business created successfully" });
        setOpen(false);
        form.reset();
        queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      },
      onError: () => toast({ title: "Failed to create business", variant: "destructive" })
    });
  }

  function handleDelete(id: number) {
    deleteMutation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Business deleted" });
        queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      }
    });
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold font-mono tracking-tight mb-2 uppercase">Businesses</h1>
          <p className="text-muted-foreground">Manage your portfolio of brands and companies.</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="font-mono uppercase tracking-wider text-xs"><Plus className="w-4 h-4 mr-2" /> Add Business</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] border-primary/20 bg-background/95 backdrop-blur">
            <DialogHeader>
              <DialogTitle className="font-mono uppercase tracking-wider">New Business Profile</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">Company Name</FormLabel>
                    <FormControl><Input {...field} className="bg-muted/50 font-mono text-sm" placeholder="Acme Corp" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="industry" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase">Industry</FormLabel>
                      <FormControl><Input {...field} className="bg-muted/50 font-mono text-sm" placeholder="Technology" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="website" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-mono text-xs uppercase">Website</FormLabel>
                      <FormControl><Input {...field} className="bg-muted/50 font-mono text-sm" placeholder="https://..." /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">Description</FormLabel>
                    <FormControl><Textarea {...field} className="bg-muted/50 min-h-[100px] text-sm" placeholder="What does the company do?" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="targetAudience" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono text-xs uppercase">Target Audience</FormLabel>
                    <FormControl><Input {...field} className="bg-muted/50 text-sm" placeholder="e.g. Small business owners" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createMutation.isPending} className="font-mono uppercase tracking-wider text-xs">
                    {createMutation.isPending ? "Saving..." : "Save Profile"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
           Array.from({length: 3}).map((_, i) => <Card key={i} className="h-[200px] animate-pulse bg-muted/20 border-muted" />)
        ) : businesses?.length === 0 ? (
          <div className="col-span-full py-12 text-center border border-dashed border-muted rounded-lg">
            <p className="text-muted-foreground font-mono">No businesses configured.</p>
          </div>
        ) : (
          businesses?.map(business => (
            <Card key={business.id} className="bg-card/40 backdrop-blur border-muted hover:border-primary/50 transition-colors flex flex-col group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Building2 className="w-24 h-24" />
              </div>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="font-bold text-lg mb-1">{business.name}</CardTitle>
                    <CardDescription className="font-mono text-xs uppercase tracking-wider text-primary">{business.industry}</CardDescription>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100" onClick={() => handleDelete(business.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{business.description}</p>
                <div className="space-y-2 text-xs text-muted-foreground">
                  {business.website && (
                    <div className="flex items-center gap-2"><Globe className="w-3 h-3" /> <span className="truncate">{business.website}</span></div>
                  )}
                  {business.targetAudience && (
                    <div className="flex items-center gap-2"><Target className="w-3 h-3" /> <span className="truncate">{business.targetAudience}</span></div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
