import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Join by meeting key + password (typed in, or from an invite link): opens
 * the pre-join lobby, which sends the join request (POST /meeting/request)
 * only when the user presses "Tham gia" — so the host is not told someone
 * is waiting while they are still choosing camera, mic and background.
 */
export const useJoinMeeting = () => {
  const navigate = useNavigate();

  return useCallback(
    async (meetingKey: string, password: string) => {
      navigate('/meeting/lobby', { state: { meetingKey, password } });
      return true;
    },
    [navigate],
  );
};
