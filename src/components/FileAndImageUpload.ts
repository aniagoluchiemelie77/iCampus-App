import { useAppSelector } from './hooks';
import { useDispatch } from 'react-redux';
import { updateCoursesEnrolled } from './UserSlice';
import type {
  Course,
} from '../types/firebase';

export const UploadCourseFormWithProgress = (
  uri: string,
  type: string,
  onProgress: (percent: number) => void,
  onComplete: (data: any) => void,
  onError: (error: any) => void
) => {
  const user = useAppSelector(state => state.user);
  const dispatch = useDispatch();

  const xhr = new XMLHttpRequest();
  const formData = new FormData();

  formData.append('file', {
    uri,
    type,
    name: 'course_form_upload',
  });
  formData.append('userId', user.uid);
  if (user.staffId !== '') {
    formData.append('staffId', user.staffId);
  }
  console.log('Uploading...');
  xhr.open('POST', 'http://192.168.1.98:5000/users/upload-course-form');

  xhr.upload.onprogress = event => {
    if (event.lengthComputable) {
      const percentComplete = Math.round((event.loaded / event.total) * 100);
      onProgress(percentComplete);
    }
  };

  xhr.onload = () => {
    if (xhr.status === 200) {
      const response = JSON.parse(xhr.responseText);
      console.log(response.courses);
      console.log(response.students);
      dispatch(
        updateCoursesEnrolled((response.courses as Course[]).map((course) => course.courseId))
      );
      onComplete(response);
    } else {
      onError(new Error(`Upload failed with status ${xhr.status}`));
    }
  };

  xhr.onerror = () => {
    onError(new Error('Network error during upload'));
  };

  xhr.send(formData);
};

