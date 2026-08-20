interface sendEmail {
    patientEmail: string,
}

interface providerResponse {
    providerId: string,
    response: string,
    success: boolean,
    retryable?: boolean
}
export const sendEmailNotification = async (data: sendEmail, attemptNo: number): Promise<providerResponse> => {
    const numberOfReqToFail = Number(Bun.env.FAIL_NO)!;
    if (!data) {
        throw new Error("Missing details for sending emails");
    }
    const { patientEmail } = data;
    const subject = "test email subject";
    const to = patientEmail;
    const successResponseFromProvider: providerResponse = {
        providerId: "2443",
        response: "Email sent successfully",
        success: true
    };
    const failureResponseFromProvider: providerResponse = {
        providerId: "3433",
        response: "Failed to send the email",
        success: false,
        retryable: Bun.env.RETRYABLE?.toLowerCase() === "true"
    };

    if (attemptNo <= numberOfReqToFail) {
        console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
        console.log(`[MOCK EMAIL] FAILED: ${failureResponseFromProvider.response} and message provider ID : ${failureResponseFromProvider.providerId}`);
        return failureResponseFromProvider;
    } else {
        console.log(`[MOCK EMAIL] To: ${to} | Subject: ${subject}`);
        console.log(`[MOCK EMAIL] SUCCESS: ${successResponseFromProvider.response} and message provider ID : ${successResponseFromProvider.providerId}`);
        return successResponseFromProvider;
    }

}

