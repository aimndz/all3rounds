import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";

export default function AuthError() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="max-w-sm">
        <CardContent className="p-8 text-center space-y-4">
          <h1 className="text-2xl font-semibold text-foreground">
            Authentication Error
          </h1>
          <p className="text-muted-foreground">
            Something went wrong during sign in. Please try again.
          </p>
          <Button asChild>
            <Link href="/">Back to Home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
