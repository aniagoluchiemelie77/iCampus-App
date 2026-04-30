const response = await fetch("https://withpersona.com/api/v1/inquiries", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.PERSONA_API_KEY}`,
    "Content-Type": "application/json",
    "Persona-Version": "2023-01-05",
  },
  body: JSON.stringify({
    data: {
      attributes: {
        "inquiry-template-id": "template_xxx", // From Persona Dashboard
        "reference-id": req.user.uid, // Connects verification to your user
      },
    },
  }),
});