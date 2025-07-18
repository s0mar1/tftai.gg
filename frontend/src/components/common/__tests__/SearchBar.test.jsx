import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import SearchBar from '../SearchBar';

// i18n 모킹
const mockT = (key) => {
  const translations = {
    'header.search_placeholder': '소환사명#태그 입력',
    'summoner.searchPlaceholder': '올바른 형식으로 입력해주세요'
  };
  return translations[key] || key;
};

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT
  }),
  I18nextProvider: ({ children }) => children
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

const TestWrapper = ({ children }) => (
  <BrowserRouter>
    {children}
  </BrowserRouter>
);

describe('SearchBar', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    window.alert.mockRestore();
  });

  test('컴포넌트가 올바르게 렌더링되어야 함', () => {
    render(
      <TestWrapper>
        <SearchBar />
      </TestWrapper>
    );

    const input = screen.getByPlaceholderText('소환사명#태그 입력');
    expect(input).toBeInTheDocument();
  });

  test('유효한 소환사명 입력시 올바른 경로로 이동해야 함', async () => {
    render(
      <TestWrapper>
        <SearchBar />
      </TestWrapper>
    );

    const input = screen.getByPlaceholderText('소환사명#태그 입력');
    const form = input.closest('form');

    fireEvent.change(input, { target: { value: '챌린저#KR1' } });
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/summoner/kr?gameName=%EC%B1%8C%EB%A6%B0%EC%A0%80&tagLine=KR1');
    });
  });

  test('태그가 없는 입력시 경고 알림이 표시되어야 함', () => {
    render(
      <TestWrapper>
        <SearchBar />
      </TestWrapper>
    );

    const input = screen.getByPlaceholderText('소환사명#태그 입력');
    const form = input.closest('form');

    fireEvent.change(input, { target: { value: '챌린저' } });
    fireEvent.submit(form);

    expect(window.alert).toHaveBeenCalledWith('올바른 형식으로 입력해주세요 (예: 챌린저#KR1)');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('빈 입력시 경고 알림이 표시되어야 함', () => {
    render(
      <TestWrapper>
        <SearchBar />
      </TestWrapper>
    );

    const input = screen.getByPlaceholderText('소환사명#태그 입력');
    const form = input.closest('form');

    fireEvent.submit(form);

    expect(window.alert).toHaveBeenCalledWith('올바른 형식으로 입력해주세요 (예: 챌린저#KR1)');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('공백만 있는 입력시 경고 알림이 표시되어야 함', () => {
    render(
      <TestWrapper>
        <SearchBar />
      </TestWrapper>
    );

    const input = screen.getByPlaceholderText('소환사명#태그 입력');
    const form = input.closest('form');

    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.submit(form);

    expect(window.alert).toHaveBeenCalledWith('올바른 형식으로 입력해주세요 (예: 챌린저#KR1)');
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});