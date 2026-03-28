import nodemailer from "nodemailer"

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  auth: {
    user: process.env.EMAIL_ID,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendemail = async ({to,subject,body}) => {
  const response = await transporter.sendMail({
    from:process.env.EMAIL_ID,
    to,
    subject,
    html:body
  })
  return response 
}

export default sendemail;