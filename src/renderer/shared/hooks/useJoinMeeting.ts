import useLoading from '@/shared/hooks/useLoading';
import { MeetingService } from '@/shared/services/Meeting';
import { MemberStatus } from '@/shared/types/meeting';
import { notification } from 'antd';
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Join by meeting key + password (typed in, or from an invite link):
 * POST /meeting/request, then the pre-join lobby (which also holds people in
 * the waiting room until the host lets them in). Resolves true on success.
 */
export const useJoinMeeting = () => {
  const navigate = useNavigate();
  const { withLoading } = useLoading();

  return useCallback(
    async (meetingKey: string, password: string) => {
      try {
        const result = await withLoading(
          MeetingService.joinMeeting({
            visionMeetingKey: meetingKey,
            visionMeetingPwd: password,
          }),
        );
        // Pending (waiting room): the lobby waits for the host's decision.
        if (
          (result?.status === MemberStatus.APPROVED ||
            result?.status === MemberStatus.PENDING) &&
          result.id
        ) {
          navigate('/meeting/lobby', { state: { meetingId: result.id } });
          return true;
        }
        notification.warning({
          message: 'Bạn không thể tham gia cuộc họp này',
          placement: 'top',
        });
      } catch (_) {
        notification.error({
          message: 'Không tham gia được cuộc họp',
          description:
            'Mã cuộc họp hoặc mật khẩu không đúng, hoặc cuộc họp đã kết thúc.',
          placement: 'top',
        });
      }
      return false;
    },
    [navigate, withLoading],
  );
};
