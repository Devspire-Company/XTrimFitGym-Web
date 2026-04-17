import GradientButton from '@/components/GradientButton';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';

type Props = {
	visible: boolean;
	onGotIt: () => void;
};

const BODY =
	'Your membership is active. On your next visit, stop by the front desk so staff can register your gym door biometric. The app will pick that up in the background—you do not need to do anything else here.';

/**
 * One-time style reminder after payment; member can continue using the app.
 */
export function FacilityBiometricPendingModal({
	visible,
	onGotIt,
}: Props) {
	return (
		<Modal
			visible={visible}
			animationType='fade'
			transparent
			onRequestClose={onGotIt}
		>
			<View style={styles.root}>
				<BlurView intensity={28} tint='default' style={StyleSheet.absoluteFill} />
				<View
					style={StyleSheet.absoluteFill}
					className='justify-center px-5 bg-black/15'
				>
					<View className='bg-bg-darker rounded-2xl border border-[#F9C513]/25 p-6 shadow-2xl'>
						<View className='items-center mb-5'>
							<View className='w-[72px] h-[72px] rounded-full bg-[#0A84FF] items-center justify-center'>
								<Ionicons name='finger-print' size={40} color='#ffffff' />
							</View>
						</View>
						<Text className='text-text-primary text-2xl font-bold text-center mb-4'>
							Quick reminder
						</Text>
						<Text className='text-text-secondary text-base text-center leading-6 mb-6'>
							{BODY}
						</Text>
						<GradientButton onPress={onGotIt}>Got it</GradientButton>
					</View>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
	},
});
