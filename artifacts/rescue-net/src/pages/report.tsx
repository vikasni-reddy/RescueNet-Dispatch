import { useCreateIncident } from "@workspace/api-client-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import * as z from "zod"
import { Link, useLocation } from "wouter"
import { ShieldAlert, AlertTriangle, BrainCircuit, Send, ArrowLeft } from "lucide-react"
import { useState } from "react"

const formSchema = z.object({
  rawText: z.string().min(10, { message: "Please describe the emergency in at least 10 characters." }),
  address: z.string().optional(),
  contactInfo: z.string().optional(),
})

export default function ReportPage() {
  const [, setLocation] = useLocation()
  const createIncident = useCreateIncident()
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { rawText: "", address: "", contactInfo: "" },
  })

  function onSubmit(values: z.infer<typeof formSchema>) {
    setIsAnalyzing(true)
    createIncident.mutate({ data: values }, {
      onSuccess: (incident) => {
        setLocation(`/report/confirmation/${incident.id}`)
      },
      onError: () => {
        setIsAnalyzing(false)
        form.setError("rawText", { message: "Submission failed. Please try again or call emergency services directly." })
      },
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Public header — no operator links */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <ShieldAlert className="w-5 h-5 text-primary" />
            <span className="font-bold text-base tracking-tight">RescueNet AI</span>
          </Link>
          <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10 md:py-16">
        <div className="w-full max-w-2xl">

          {/* Emergency callout banner */}
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive font-medium">
              If this is a life-threatening emergency requiring immediate assistance, call <span className="font-black">112</span> or your local emergency number now.
            </p>
          </div>

          {isAnalyzing ? (
            <div className="rounded-2xl border border-border bg-card p-12 flex flex-col items-center justify-center space-y-6 text-center">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full w-24 h-24 animate-pulse" />
                <BrainCircuit className="w-20 h-20 text-primary animate-pulse relative z-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold">Analyzing your report…</h2>
                <p className="text-muted-foreground text-sm max-w-xs">
                  Our AI is processing your emergency report and notifying the response team.
                </p>
              </div>
              <div className="w-56 h-1.5 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-primary w-full origin-left animate-[progress_2s_ease-in-out_infinite]" />
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="bg-destructive/10 border-b border-border px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-destructive/20 rounded-full">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold">Report an Emergency</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Your report goes directly to our AI triage system and emergency response team.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    <FormField
                      control={form.control}
                      name="rawText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Describe the Emergency <span className="text-destructive">*</span></FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe what is happening, who is affected, and where. Write in any language. Example: 'Building on fire at Lakdi-ka-pul junction, 3 people trapped on 2nd floor, children present.'"
                              className="min-h-[140px] resize-none text-sm bg-background"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>Be as specific as possible. AI will extract details automatically.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location / Address <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                            <FormControl>
                              <Input placeholder="Street, landmark, or area" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormDescription>AI will try to extract this from your description if left blank.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="contactInfo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Your Contact <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                            <FormControl>
                              <Input placeholder="Phone number or name" {...field} value={field.value ?? ""} />
                            </FormControl>
                            <FormDescription>So the response team can reach you if needed.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="pt-2">
                      <Button type="submit" size="lg" className="w-full gap-2 text-base" disabled={createIncident.isPending}>
                        <Send className="w-4 h-4" />
                        Submit Emergency Report
                      </Button>
                      <p className="text-xs text-muted-foreground text-center mt-3">
                        Your report is processed immediately. You will receive a tracking ID on the next screen.
                      </p>
                    </div>

                  </form>
                </Form>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-border/40 py-4 text-center text-xs text-muted-foreground">
        RescueNet AI · Emergency Response System · Built for Idea2Impact Hackathon 2026
      </footer>
    </div>
  )
}
