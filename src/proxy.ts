import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

// /api/rxnorm is left out: it's an anonymous, CDN-cached lookup that needs no session.
export const config = {
  matcher: [
    "/((?!_next|api/rxnorm|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api(?!/rxnorm)|trpc)(.*)",
  ],
};
