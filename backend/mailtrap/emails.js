// import { PASSWORD_RESET_REQUEST_TEMPLATE, PASSWORD_RESET_SUCCESS_TEMPLATE, VERIFICATION_EMAIL_TEMPLATE } from "./emailTemplates.js";
// import { mailtrapClient, sender } from "./mailtrap.config.js";

// export const sendVerificationEmail = async (email, verificationToken) =>{
//     const recipient = [{email}]

//     try {
//         const response = await mailtrapClient.send({
//             from: sender,
//             to: recipient,
//             subject: "Verify your Email",
//             html: VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", verificationToken),
//             category: "Email verification"
//         })

//         console.log("email send successfully", response);
//         console.log(response.from,response.recipient,response.html);
//         console.log(response);
        
        
        
//     } catch (error) {
//         console.log("error sending email",error);
//         throw new Error(`error sending email ${error}`)
//     }
// }

// export const sendWelcomeEmail = async (email, name) => {
//     const recipient = [{ email }];

//     try {
//         const response = await mailtrapClient.send({
//             from: sender,
//             to: recipient,
//             template_uuid:  "19f1c2a0-6a30-4169-805f-90a2a5cb1958",
//             template_variables: {
//              company_info_name: "My Company",
//              name: name,
//     },
//         });
//         console.log("welcome email sent successfully", response);
//     } catch (error) {
//         console.error(`error sending welcome email`, error);

//         throw new error(`error sending welcome email: ${error}`);
//     }
// }

// export const sendPasswordResetEmail = async (email, resetURL) => {
//     const recipient = [{ email }];

//     try {
//         const response = await mailtrapClient.send({ 
//             from: sender,
//             to: recipient,
//             subject: "reset your password",
//             html: PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL),
//             category: "Password Reset",
            
//         })
//         console.log("email send successfully", response);
//         console.log(response.from,response.recipient,response.html);
//         console.log(response);
//     } catch (error) {
//         console.error(`error sending password reset email`, error);
//         // console.log(`Password reset link:          ${process.env.CLIENT_URL}/reset-password/${resetToken}`);
        
//         throw new Error(`error sending password reset email: ${error}`);
        
//     }
// }

// export const sendResetSuccessEmail = async (email) => {
//     const recipient = [{ email }];

//     try {
//         const response = await mailtrapClient.send({
//             from: sender,
//             to: recipient,
//             subject: "password reset successfully",
//             html: PASSWORD_RESET_SUCCESS_TEMPLATE,
//             category: "Password Reset",
//         });

//         console.log("password reset email sent successfully",response)
//     } catch (error) {
//         console.error(`error sending password reset success email`, error);
        
//         throw new Error(`error sending password reset success email: ${error}`);
//     }
// }



// emailService.js (updated from Mailtrap to Nodemailer using Gmail)

import nodemailer from "nodemailer";
import dotenv from "dotenv";
import {
  PASSWORD_RESET_REQUEST_TEMPLATE,
  PASSWORD_RESET_SUCCESS_TEMPLATE,
  VERIFICATION_EMAIL_TEMPLATE
} from "./emailTemplates.js";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Gmail address
    pass: process.env.EMAIL_PASS  // Gmail app password
  }
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    const mailOptions = {
      from: `"Your App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
  } catch (error) {
    console.error("Error sending email:", error);
    throw new Error("Failed to send email");
  }
};

export const sendVerificationEmail = async (email, verificationToken) => {
  const html = VERIFICATION_EMAIL_TEMPLATE.replace("{verificationCode}", verificationToken);
  await sendEmail({
    to: email,
    subject: "Verify your Email",
    html
  });
};

export const sendWelcomeEmail = async (email, name) => {
  const html = `
    <h2>Welcome, ${name}!</h2>
    <p>Thanks for verifying your email. We're happy to have you on board!</p>
  `;
  await sendEmail({
    to: email,
    subject: "Welcome to Our App",
    html
  });
};

export const sendPasswordResetEmail = async (email, resetURL) => {
  const html = PASSWORD_RESET_REQUEST_TEMPLATE.replace("{resetURL}", resetURL);
  await sendEmail({
    to: email,
    subject: "Reset Your Password",
    html
  });
};

export const sendResetSuccessEmail = async (email) => {
  await sendEmail({
    to: email,
    subject: "Password Reset Successful",
    html: PASSWORD_RESET_SUCCESS_TEMPLATE
  });
};
