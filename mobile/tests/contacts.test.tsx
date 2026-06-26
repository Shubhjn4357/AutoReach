import { render } from '@testing-library/react-native';
import { ContactsScreen } from '../app/(tabs)/index.tsx'; // adjust path if needed

test('renders contacts screen', () => {
  const { getByText } = render(<ContactsScreen />);
  expect(getByText(/Create New Contact/i)).toBeTruthy();
});
