import { useState, useEffect } from "react";
import { getCustomerId } from "@/lib/storage";
import { findCustomerById } from "@/lib/api";
export function useCustomerValidation() {
    const [customerExists, setCustomerExists] = useState(null);
    const [validatingCustomer, setValidatingCustomer] = useState(false);
    useEffect(() => {
        const validateCustomer = async () => {
            const customerId = getCustomerId();
            if (!customerId || customerId === "undefined") {
                setCustomerExists(false);
                return;
            }
            setValidatingCustomer(true);
            try {
                const customer = await findCustomerById(customerId);
                setCustomerExists(!!customer);
            }
            catch (error) {
                setCustomerExists(false);
            }
            finally {
                setValidatingCustomer(false);
            }
        };
        validateCustomer();
    }, []);
    const hasOnboarding = customerExists === false || customerExists === null;
    return {
        customerExists,
        validatingCustomer,
        hasOnboarding,
        setCustomerExists,
    };
}
