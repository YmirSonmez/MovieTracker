import { create } from 'zustand'
import { storage } from '@/services/storage/repository'
import type { MediaType } from '@/types/media'
import type { Rating, Review } from '@/types/watch'

interface RatingsState {
  hydrated: boolean
  ratings: Record<string, Rating>
  reviews: Record<string, Review>

  hydrate: () => Promise<void>
  getRating: (mediaId: string) => number | undefined
  setRating: (mediaId: string, mediaType: MediaType, value: number) => Promise<void>
  clearRating: (mediaId: string) => Promise<void>
  getReview: (mediaId: string) => string | undefined
  setReview: (mediaId: string, mediaType: MediaType, text: string) => Promise<void>
  clearReview: (mediaId: string) => Promise<void>
}

function now(): string {
  return new Date().toISOString()
}

export const useRatingsStore = create<RatingsState>((set, get) => ({
  hydrated: false,
  ratings: {},
  reviews: {},

  async hydrate() {
    const [ratings, reviews] = await Promise.all([storage.getAllRatings(), storage.getAllReviews()])
    set({
      ratings: Object.fromEntries(ratings.map((r) => [r.mediaId, r])),
      reviews: Object.fromEntries(reviews.map((r) => [r.mediaId, r])),
      hydrated: true,
    })
  },

  getRating(mediaId) {
    return get().ratings[mediaId]?.value
  },

  async setRating(mediaId, mediaType, value) {
    const clamped = Math.min(5, Math.max(0.5, Math.round(value * 2) / 2))
    const existing = get().ratings[mediaId]
    const timestamp = now()
    const rating: Rating = {
      id: mediaId,
      mediaId,
      mediaType,
      value: clamped,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }
    await storage.putRating(rating)
    set((state) => ({ ratings: { ...state.ratings, [mediaId]: rating } }))
  },

  async clearRating(mediaId) {
    await storage.deleteRating(mediaId)
    set((state) => {
      const ratings = { ...state.ratings }
      delete ratings[mediaId]
      return { ratings }
    })
  },

  getReview(mediaId) {
    return get().reviews[mediaId]?.text
  },

  async setReview(mediaId, mediaType, text) {
    const existing = get().reviews[mediaId]
    const timestamp = now()
    const review: Review = {
      id: mediaId,
      mediaId,
      mediaType,
      text,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
    }
    await storage.putReview(review)
    set((state) => ({ reviews: { ...state.reviews, [mediaId]: review } }))
  },

  async clearReview(mediaId) {
    await storage.deleteReview(mediaId)
    set((state) => {
      const reviews = { ...state.reviews }
      delete reviews[mediaId]
      return { reviews }
    })
  },
}))
