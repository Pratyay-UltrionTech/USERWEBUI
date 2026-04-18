import { useNavigate } from 'react-router';
import { ArrowLeft, MapPin, Calendar, Clock, Car, Edit2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useBooking } from '../context/BookingContext';

export function BookingSummary() {
  const navigate = useNavigate();
  const { selectedBranch, serviceType, vehicleType, selectedService, selectedAddOns, selectedDate, selectedTime, selectedEndTime } = useBooking();

  const booking = {
    branch: {
      name: selectedBranch?.name ?? '—',
      location: selectedBranch?.location ?? '—',
    },
    serviceType: serviceType === 'onsite' ? 'Mobile Service' : 'At Branch',
    vehicleType: vehicleType ?? '—',
    vehicle: vehicleType ?? '—',
    service: {
      name: selectedService?.name ?? '—',
      price: selectedService?.price ?? 0,
    },
    addOns: selectedAddOns,
    date: selectedDate
      ? selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      : '—',
    time: selectedTime ? `${selectedTime}${selectedEndTime ? ` - ${selectedEndTime}` : ''}` : '—',
  };

  const subtotal = booking.service.price + booking.addOns.reduce((sum, addon) => sum + addon.price, 0);
  const tax = subtotal * 0.1;
  const total = subtotal + tax;

  const handleConfirm = () => {
    navigate('/payment');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Booking Summary
              </h1>
              <p className="text-sm text-gray-500">Review your booking details</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Branch Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#4F46E5]" />
                <h2 className="text-lg font-semibold text-gray-900">Location</h2>
              </div>
              <button
                onClick={() => navigate('/home')}
                className="text-[#4F46E5] text-sm font-medium hover:underline flex items-center gap-1"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            </div>
            <div>
              <p className="font-medium text-gray-900">{booking.branch.name}</p>
              <p className="text-sm text-gray-500">{booking.branch.location}</p>
              <p className="text-sm text-gray-500 mt-2">{booking.serviceType}</p>
            </div>
          </div>

          {/* Service Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-[#4F46E5]" />
                <h2 className="text-lg font-semibold text-gray-900">Service Details</h2>
              </div>
              <button
                onClick={() => navigate(-3)}
                className="text-[#4F46E5] text-sm font-medium hover:underline flex items-center gap-1"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{booking.service.name}</p>
                  <p className="text-sm text-gray-500">{booking.vehicleType} - {booking.vehicle}</p>
                </div>
                <p className="font-semibold text-gray-900">${booking.service.price}</p>
              </div>

              {booking.addOns.length > 0 && (
                <>
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Add-Ons</p>
                    {booking.addOns.map((addon, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-1"
                      >
                        <p className="text-sm text-gray-600">{addon.name}</p>
                        <p className="text-sm font-medium text-gray-900">
                          ${addon.price}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Date & Time */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#4F46E5]" />
                <h2 className="text-lg font-semibold text-gray-900">Date & Time</h2>
              </div>
              <button
                onClick={() => navigate(-1)}
                className="text-[#4F46E5] text-sm font-medium hover:underline flex items-center gap-1"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-400" />
                <p className="text-gray-900">{booking.date}</p>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" />
                <p className="text-gray-900">{booking.time}</p>
              </div>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Price Breakdown
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-gray-600">Subtotal</p>
                <p className="font-medium text-gray-900">${subtotal.toFixed(2)}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-gray-600">Tax (10%)</p>
                <p className="font-medium text-gray-900">${tax.toFixed(2)}</p>
              </div>
              <div className="border-t border-gray-200 pt-3 flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-gray-900">Total</p>
                </div>
                <p className="text-2xl font-bold text-[#4F46E5]">
                  ${total.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Confirm Button */}
        <div className="mt-8 sticky bottom-0 bg-gray-50 py-4 -mx-4 px-4 border-t border-gray-200">
          <div className="max-w-3xl mx-auto">
            <button
              onClick={handleConfirm}
              className="w-full bg-[#4F46E5] text-white py-4 rounded-xl font-medium hover:bg-[#4338CA] transition-colors shadow-sm"
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}