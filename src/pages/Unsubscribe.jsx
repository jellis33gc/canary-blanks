// src/pages/Unsubscribe.jsx
//
// Public, unauthenticated page at /unsubscribe (registered in App.jsx). Email links look
// like: https://<your-app-domain>/unsubscribe?token=xxxxx

import { useEffect, useState } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { base44 } from "@/api/base44Client";

export default function Unsubscribe() {
  const [state, setState] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setState("error");
      setMessage("This unsubscribe link is missing its token.");
      return;
    }

    base44.functions
      .invoke("unsubscribe", { token })
      .then((response) => {
        const data = response?.data ?? response;
        if (data?.error) {
          setState("error");
          setMessage(data.error);
        } else {
          setState("success");
          setEmail(data?.email || "");
        }
      })
      .catch(() => {
        setState("error");
        setMessage("Something went wrong processing your request.");
      });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 text-center">
        {state === "loading" && <p className="text-muted-foreground">Processing your request...</p>}

        {state === "success" && (
          <>
            <h1 className="text-2xl font-semibold text-foreground">You're unsubscribed</h1>
            <p className="mt-2 text-muted-foreground">
              {email ? <>{email} has</> : "You've"} been removed from our marketing emails. You
              won't receive any further newsletters, campaigns, or automated emails from us.
            </p>
          </>
        )}

        {state === "error" && (
          <>
            <h1 className="text-2xl font-semibold text-foreground">Couldn't process that</h1>
            <p className="mt-2 text-muted-foreground">{message}</p>
          </>
        )}
      </div>
      <Footer />
    </div>
  );
}
