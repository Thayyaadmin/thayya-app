"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Calendar, Users, FileText } from "lucide-react"

type QuickActionsProps = {
  onAddWorkshop?: () => void
}

export function QuickActions({ onAddWorkshop }: QuickActionsProps) {
  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() => onAddWorkshop?.()}
            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all duration-300 hover:shadow-primary/30"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add New Workshop
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-border/50 hover:bg-secondary/50 hover:border-accent/50 transition-all duration-300"
            disabled
            title="Coming soon"
          >
            <Calendar className="mr-2 h-4 w-4" />
            Schedule Session
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-border/50 hover:bg-secondary/50 hover:border-accent/50 transition-all duration-300"
            disabled
            title="Coming soon"
          >
            <Users className="mr-2 h-4 w-4" />
            Manage Students
          </Button>
          <Button
            type="button"
            variant="outline"
            className="border-border/50 hover:bg-secondary/50 hover:border-accent/50 transition-all duration-300"
            disabled
            title="Coming soon"
          >
            <FileText className="mr-2 h-4 w-4" />
            View Reports
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
