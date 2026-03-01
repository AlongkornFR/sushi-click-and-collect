'use client';
import { useEffect, useState } from 'react';
import { fetchReviews } from '@/services/api';

const StarRating = ({ rating }) => {
    return (
        <div className="flex text-yellow-400">
            {[...Array(5)].map((_, i) => (
                <svg key={i} className={`w-5 h-5 ${i < Math.round(rating) ? 'fill-current' : 'text-gray-300'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
            ))}
        </div>
    );
};

export default function ReviewSection() {
    const [data, setData] = useState(null);

    useEffect(() => {
        fetchReviews().then(setData);
    }, []);

    if (!data || !data.reviews) return null;

    return (
        <section className="py-12 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-10">
                    <h2 className="text-3xl font-extrabold text-gray-900">Ce que nos clients disent</h2>
                    <div className="flex justify-center items-center mt-2 space-x-2">
                        <span className="text-2xl font-bold text-gray-900">{data.rating}</span>
                        <StarRating rating={data.rating} />
                        <span className="text-gray-500">({data.total_reviews} avis Google)</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    {data.reviews.map((review, index) => (
                        <div key={index} className="bg-gray-50 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center mb-4">
                                <img 
                                    src={review.profile_photo_url} 
                                    alt={review.author_name} 
                                    className="w-10 h-10 rounded-full mr-3"
                                />
                                <div>
                                    <h4 className="font-bold text-sm">{review.author_name}</h4>
                                    <p className="text-xs text-gray-500">{review.relative_time_description}</p>
                                </div>
                            </div>
                            <StarRating rating={review.rating} />
                            <p className="mt-3 text-gray-600 text-sm italic line-clamp-4">
                                "{review.text}"
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}