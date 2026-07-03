import { resendClient,sender } from "../lib/resend.js"
import { createWelcomeEmailTemplate } from "./emailTemplates.js"

export const sendWelcomeEmail = async (email,name,clientURl) =>{
    const {data,error} = await resendClient.emails.send({
        from:`${sender.name} < ${sender.email} >`,
        to:email,
        subject:"welcome to Chatify !",
        html: createWelcomeEmailTemplate(name,clientURl)
    });

    if(error){
        console.log("Error sending welcome email:",error);
        throw new Error("Failed to send welcome email");
        
    }

    console.log("Welcome Email sent successfully",data)
}