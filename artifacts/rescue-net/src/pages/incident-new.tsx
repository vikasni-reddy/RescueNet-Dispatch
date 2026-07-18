import { Layout } from "@/components/layout"
import { useCreateIncident } from "@workspace/api-client-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { useLocation } from "wouter"
import { BrainCircuit, Send, AlertTriangle } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

const formSchema = z.object({
  rawText: z.string().min(10, { message: "Description must be at least 10 characters." }),
  address: z.string().optional(),
  contactInfo: z.string().optional(),
})

export default function NewIncidentPage() {
  const [, setLocation] = useLocation()
  const createIncident = useCreateIncident()
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rawText: "",
      address: "",
      contactInfo: "",
    },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsAnalyzing(true)
    createIncident.mutate({ data: values }, {
      onSuccess: (incident) => {
        toast.success("Incident reported and analyzed successfully")
        setLocation(`/incidents/${incident.id}`)
      },
      onError: () => {
        toast.error("Failed to report incident")
        setIsAnalyzing(false)
      }
    })
  }

  return (
    <Layout>
      <div className="flex-1 overflow-y-auto p-6 md:p-8 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          
          <Card className="border-border shadow-lg">
            <CardHeader className="bg-destructive/10 border-b border-border pb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-destructive/20 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Report Emergency</CardTitle>
                  <CardDescription className="text-foreground/70">
                    Submit raw intelligence. AI will extract location, determine severity, and route to dispatch.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              
              {isAnalyzing ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-6">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full w-24 h-24 animate-pulse"></div>
                    <BrainCircuit className="w-24 h-24 text-primary animate-pulse relative z-10" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-bold">AI Analyzing Incident...</h3>
                    <p className="text-muted-foreground max-w-sm">
                      Extracting location data, evaluating severity parameters, and determining optimal resource allocation.
                    </p>
                  </div>
                  <div className="w-64 h-2 bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-primary w-full origin-left animate-[progress_2s_ease-in-out_infinite]"></div>
                  </div>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="rawText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base">Incident Report / Dispatch Audio Transcript</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Type or paste the raw emergency report here. e.g. 'Trapped family of 4 on roof, water rising fast near 123 Main St, need boat rescue immediately.'" 
                              className="min-h-[150px] resize-none font-mono text-sm bg-background border-input focus-visible:ring-primary" 
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>
                            Include all available details. AI will parse this text to determine urgency and required resources.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirmed Location (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Main St, City" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormDescription>AI will attempt to extract this if left blank.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="contactInfo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Reporter Contact (Optional)</FormLabel>
                            <FormControl>
                              <Input placeholder="Phone or Radio Channel" {...field} value={field.value || ""} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="pt-4 flex justify-end">
                      <Button type="submit" size="lg" className="w-full md:w-auto gap-2" disabled={createIncident.isPending}>
                        <Send className="w-4 h-4" />
                        Submit for AI Triage
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>
          
        </div>
      </div>
    </Layout>
  )
}
