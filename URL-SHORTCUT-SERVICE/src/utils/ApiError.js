/**
 * Beklenen (operasyonel) hatalar icin Error alt sinifi.
 * Servis katmani bunu firlatir, errorHandler status kodunu buradan okur.
 *
 * Kullanim: throw ApiError.notFound('Link bulunamadi');
 */
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    // Bu bayrak errorHandler'a "bu hata istemciye gosterilebilir" der.
    // Bayraksiz hatalar 500 + genel mesaj olarak doner.
    this.isOperational = true;
    Error.captureStackTrace(this, ApiError);
  }

  static badRequest(message = 'Gecersiz istek') {
    return new ApiError(400, message);
  }

  static unauthorized(message = 'Yetkisiz') {
    return new ApiError(401, message);
  }

  static notFound(message = 'Bulunamadi') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Cakisma') {
    return new ApiError(409, message);
  }

  static gone(message = 'Bu kaynak artik gecerli degil') {
    return new ApiError(410, message);
  }

  static internal(message = 'Sunucu hatasi') {
    return new ApiError(500, message);
  }
}

module.exports = ApiError;
