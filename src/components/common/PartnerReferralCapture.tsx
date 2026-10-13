import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { capturePartnerReferral } from '../../utils/partnerReferral'
import { attachPartnerReferral } from '../../services/partnerReferral'

export default function PartnerReferralCapture() {
  const { search } = useLocation()
  const { currentUser } = useApp()
  useEffect(() => {
    capturePartnerReferral(search)
    if (currentUser) void attachPartnerReferral().catch(() => {})
  }, [search, currentUser?.id])
  return null
}
