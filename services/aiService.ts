import { UserProfile, DailyReport } from "../types";

export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
}

export interface ExtractedBillData {
    date?: string;
    customerName?: string;
    customerPhone?: string;
    billId?: string;
    txnNumber?: string;
    items: {
        productName: string;
        quantity: number;
        price: number;
    }[];
    isGeyserFound: boolean;
    rawText?: string;
}

export const extractDataFromBill = async (base64Image: string, user: UserProfile): Promise<ExtractedBillData> => {
    const base64Data = base64Image.split(',')[1] || base64Image;

    const response = await fetch('/api/extract-bill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data, userApiKey: user.apiKey })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to extract data from bill. Please try again or enter manually.");
    }

    return await response.json();
};

export const getMotivationalQuote = async (apiKey?: string): Promise<string> => {
    if (apiKey) console.log("Using custom API key for quote");
    const quotes = [
        "Believe you can and you're halfway there.",
        "Quality means doing it right when no one is looking.",
        "The only way to do great work is to love what you do.",
        "Success is not final, failure is not fatal.",
        "Your limitation—it's only your imagination."
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
};

export const sendCoachMessage = async (user: UserProfile, sales: DailyReport[], history: ChatMessage[], message: string): Promise<string> => {
    const response = await fetch('/api/coach-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, user, sales, history, userApiKey: user.apiKey })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to send message to coach.");
    }

    const data = await response.json();
    return data.text;
};

export const getOfflineResponse = (message: string, user: UserProfile): string => {
    console.log("Offline processing for:", message);
    return `Keep pushing, ${user.name.split(' ')[0]}! Every sale counts.`;
};
