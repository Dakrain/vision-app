export type LoginRequest = {
  email: string;
  password: string;
};

// Mirrors mobile's RegisterRequest (lib/data/requests/register_request.dart):
// only firstName/lastName/email/password are required by the API, everything
// else on that model is optional and unused by the functional registration
// screen, so we don't collect or send it here.
export type RegisterRequest = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  /** See GENDER_UNSET: left out, the server stores 0 (= Nữ). */
  gender?: number;
};

/** Gender codes: 1 Nam, 0 Nữ. 2 = not chosen (the column has no "none"). */
export const GENDER_UNSET = 2;
