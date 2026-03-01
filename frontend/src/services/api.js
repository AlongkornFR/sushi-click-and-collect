import axios from "axios"

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL
})

export const fetchReviews = async () => {
    try {
        // Note: assure-toi que API_URL pointe bien vers ton backend Django
        const response = await api.get('/reviews/'); 
        return response.data;
    } catch (error) {
        console.error("Erreur lors du chargement des avis", error);
        return null;
    }
};