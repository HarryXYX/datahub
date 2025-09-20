import styled from 'styled-components';

import { colors } from '@src/alchemy-components';

export const PageContainer = styled.div<{ $isShowNavBarRedesign?: boolean }>`
    overflow: auto;
    margin: ${(props) => (props.$isShowNavBarRedesign ? '0' : '0 12px 12px 0')};
    padding: 16px 20px 20px 20px;
    border-radius: ${(props) =>
        props.$isShowNavBarRedesign ? props.theme.styles['border-radius-navbar-redesign'] : '8px'};
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 20px;
    background-color: ${colors.white};
    ${(props) => props.$isShowNavBarRedesign && 'max-height: calc(100vh - 88px);'};
    ${(props) =>
        props.$isShowNavBarRedesign &&
        `
        box-shadow: ${props.theme.styles['box-shadow-navbar-redesign']};
        margin: 5px;
    `}
`;

export const TableContainer = styled.div`
    display: flex;
    flex: 1;
    min-height: 0;
`;

export const DropzoneTableContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    min-height: 400px;
    border: 2px dashed ${colors.gray[1400]};
    border-radius: 8px;
    background-color: ${colors.gray[50]};
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:hover {
        border-color: ${colors.violet[200]};
        background-color: ${colors.violet[50]};
    }
`;

export const DropzoneContent = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    text-align: center;
`;

export const DropzoneIcon = styled.div`
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: ${colors.gray[100]};
    border-radius: 50%;
    color: ${colors.gray[400]};
`;

export const DropzoneText = styled.div`
    font-size: 16px;
    font-weight: 500;
    color: ${colors.gray[600]};
`;

export const DropzoneSubtext = styled.div`
    font-size: 14px;
    color: ${colors.gray[400]};
`;

export const HeaderContainer = styled.div`
    display: flex;
    justify-content: space-between;
`;

export const HeaderContent = styled.div`
    display: flex;
    flex-direction: column;
`;

export const ButtonContainer = styled.div`
    display: flex;
    align-self: center;
`;
