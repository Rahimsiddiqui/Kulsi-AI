// Email utility functions

export const generateVerificationCode = () => {
  return Math.random().toString().substring(2, 8);
};

export const sendVerificationEmail = async (email, code) => {
  // Mock implementation - in production, use nodemailer or similar
  console.log(`Verification code for ${email}: ${code}`);
  // const transporter = nodemailer.createTransport({...});
  // await transporter.sendMail({
  //   to: email,
  //   subject: "Verify your email",
  //   html: `Your verification code is: ${code}`
  // });
};

export const sendResetEmail = async (email, resetToken) => {
  // Mock implementation
  console.log(`Reset link for ${email}: ${resetToken}`);
};
