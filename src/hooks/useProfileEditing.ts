
import { useState } from 'react';


export const useProfileEditing = (currentProfile: any) => {
  const [tempBio, setTempBio] = useState('');
  const [tempSkills, setTempSkills] = useState<string[]>([]); 

  const initDrafts = () => {
    setTempBio(currentProfile?.bio || '');
    setTempSkills(currentProfile?.skills || []);
  };


  return { 
    tempBio, 
    setTempBio, 
    tempSkills, 
    setTempSkills, 
    initDrafts
};
};